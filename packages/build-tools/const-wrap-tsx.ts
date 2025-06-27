import { readFile } from 'node:fs/promises';

import generateModule from '@babel/generator';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';

import {
  type CallExpression,
  callExpression,
  type Expression,
  identifier,
  importDeclaration,
  importSpecifier,
  isIdentifier,
  isLiteral,
  isNullLiteral,
  isNumericLiteral,
  isObjectExpression,
  isSpreadElement,
  isStringLiteral,
  isUnaryExpression,
  type JSXNamespacedName,
  type Node,
  type NumericLiteral,
  type ObjectProperty,
  type ObjectMethod,
  type Program,
  type SpreadElement,
  stringLiteral,
  type UnaryExpression
} from '@babel/types';
import { valueToNode } from '@babel/types';
import { type ArgumentPlaceholder } from '@babel/types';
import * as esbuild from 'esbuild';
import { type Plugin, transform } from 'esbuild';

const countLinesInString = (value: string) => (value.match(/\n/g) || '').length;

const isNegativeNumber = (
  node: Node
): node is Omit<UnaryExpression, 'argument'> & { argument: NumericLiteral } =>
  isUnaryExpression(node) &&
  node.operator === '-' &&
  isNumericLiteral(node.argument);

const isJsxFunction = (node: CallExpression) =>
  isIdentifier(node.callee, { name: 'jsx' }) ||
  isIdentifier(node.callee, { name: 'jsxs' });

const getFlattenedProps = (
  props: Expression | ArgumentPlaceholder | JSXNamespacedName | SpreadElement
) => {
  // No props
  if (isNullLiteral(props)) {
    return [];
  }

  // One or more props
  if (isObjectExpression(props)) {
    return props.properties
      .map((prop) => {
        // Spread props
        if (isSpreadElement(prop) && isObjectExpression(prop.argument)) {
          return prop.argument.properties;
        }

        // Regular props
        return prop;
      })
      .flat();
  }

  return [];
};

const constIdentifier = '__DCGVIEW_CONST';

const constWrap = (source: string) => {
  const ast = parse(source, {
    plugins: ['jsx'],
    sourceType: 'module'
  });

  let hasWrapping = false;

  const traverse = traverseModule.default || traverseModule;
  const generate = generateModule.default || generateModule;

  traverse(ast, {
    CallExpression({ node }: { node: CallExpression }) {
      if (!isJsxFunction(node)) {
        return;
      }

      const [tagName, props] = node.arguments;
      if (!isStringLiteral(tagName)) {
        return;
      }

      const flattenedProps = getFlattenedProps(props);
      if (!flattenedProps) {
        return;
      }

      // Wrap props with literal values
      flattenedProps.forEach((prop: ObjectProperty | ObjectMethod | SpreadElement) => {
        if (
          ('key' in prop && isIdentifier(prop.key, { name: 'children' })) ||
          !('value' in prop) ||
          (!isLiteral(prop.value) && !isNegativeNumber(prop.value))
        ) {
          return;
        }

        hasWrapping = true;

        let value: string | number | boolean | null = null;
        if (isNegativeNumber(prop.value)) {
          value = -prop.value.argument.value;
        }

        if ('value' in prop.value) {
          value = prop.value.value;
        }

        (prop as ObjectProperty).value = callExpression(identifier(constIdentifier), [
          valueToNode(value)
        ]);
      });
    },

    Program: {
      exit({ node }: { node: Program }) {
        if (!hasWrapping) {
          return;
        }

        node.body.unshift(
          importDeclaration(
            [
              importSpecifier(
                identifier(constIdentifier),
                identifier('makeConst')
              )
            ],
            stringLiteral('dcgview/const')
          )
        );
      }
    }
  });

  let { code: generated } = generate(ast, { retainLines: true });

  // Babel strips the last newline character for some reason.
  if (source.endsWith('\n') && !generated.endsWith('\n')) {
    generated += '\n';
  }

  // Verify line counts are the same.
  const lineCountBefore = countLinesInString(source);
  const lineCountAfter = countLinesInString(generated);
  if (lineCountBefore !== lineCountAfter) {
    throw new Error(
      `Expected line count before const wrapping (${lineCountBefore}) to match line count after const wrapping (${lineCountAfter}), but got different counts.`
    );
  }

  return generated;
};

type TransformResult =
  | Pick<esbuild.OnLoadResult, 'contents' | 'errors'>
  | undefined;
export type TransformFn<Args extends unknown[]> = (
  ...args: Args
) => TransformResult | Promise<TransformResult>;


const transformTsx: TransformFn<[string]> = async (path) => {
  const { code } = await transform(await readFile(path, 'utf8'), {
    loader: 'tsx',
    sourcefile: path,
    jsx: 'automatic',
    jsxImportSource: 'dcgview/jsx',
    sourcemap: 'inline',
    tsconfigRaw: {
      compilerOptions: {
        useDefineForClassFields: false
      }
    }
  });

  return {
    contents: Buffer.from(constWrap(code)),
    errors: []
  };
};

export const constWrapTsx = () =>
  ({
    name: 'const-wrap-tsx',
    setup(build) {
      build.onLoad({ filter: /\.tsx$/ }, async ({ path }) => {
        const transformed = await transformTsx(path);

        if (!transformed?.contents || transformed.errors?.length) {
          return transformed;
        }

        return {
          contents: transformed.contents,
          loader: 'js'
        };
      });
    }
  }) satisfies Plugin;
