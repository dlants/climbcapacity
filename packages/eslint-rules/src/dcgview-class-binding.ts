import type { TSESTree } from "@typescript-eslint/types";
import { ESLintUtils } from "@typescript-eslint/utils";

export const dcgviewClassBindingRule = ESLintUtils.RuleCreator.withoutDocs({
  meta: {
    type: "problem",
    docs: {
      description: "Enforce correct DCGView attribute binding patterns",
    },
    fixable: "code",
    hasSuggestions: true,
    schema: [],
    messages: {
      invalidAttributeBinding:
        "Invalid attribute binding in DCGView. Use string literal, getter function, or DCGView.const() for static values.",
      suggestGetter:
        "Consider wrapping in a getter function: {{attributeName}}={() => value}",
      suggestDCGViewConst:
        "For static values, consider using DCGView.const(value)",
      nonFunctionExpression:
        "DCGView attribute must be a function, DCGView.const(), or string literal",
      functionCallNotAllowed:
        "Function calls are not allowed in DCGView attributes. Use a getter function instead: () => functionCall()",
    },
  },
  defaultOptions: [],

  create(context) {
    function isFunctionType(expression: TSESTree.Expression): boolean {
      const services = context.sourceCode.parserServices;

      if (!services?.program || !services?.esTreeNodeToTSNodeMap) {
        throw new Error(`parserServices not available`);
      }

      const checker = services.program.getTypeChecker();
      const tsNode = services.esTreeNodeToTSNodeMap.get(expression);

      if (tsNode) {
        const type = checker.getTypeAtLocation(tsNode);

        // Use TypeScript's built-in type checking methods
        const callSignatures = type.getCallSignatures();
        if (callSignatures && callSignatures.length > 0) {
          return true;
        }
      }

      return false;
    }

    function isDCGViewElement(jsxElement: TSESTree.Node): boolean {
      // Check if this is a DCGView component by looking at the opening element
      if (jsxElement.type !== "JSXElement") return false;

      const openingElement = (jsxElement as TSESTree.JSXElement).openingElement;
      if (!openingElement?.name) return false;

      // Check for intrinsic HTML elements (lowercase names) - these use DCGView binding rules
      if (
        openingElement.name.type === "JSXIdentifier" &&
        openingElement.name.name.toLowerCase() === openingElement.name.name
      ) {
        return true;
      }

      // Check for DCGView component classes (capitalized names that extend DCGView.Class)
      // This would require more sophisticated analysis, so for now we'll be conservative
      // and only apply to intrinsic elements
      return false;
    }

    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        // Skip if no value (e.g., <div class />)
        if (!node.value || !node.name) {
          return;
        }

        // Find the parent JSX element to check if it's a DCGView element
        let parent: TSESTree.BaseNode = node.parent;
        while (parent && parent.type !== "JSXOpeningElement") {
          parent = parent.parent as TSESTree.BaseNode;
        }

        if (!parent || parent.type !== "JSXOpeningElement") return;

        // Get the JSX element from the opening element
        const jsxElement = parent.parent as TSESTree.JSXElement;
        if (!jsxElement || jsxElement.type !== "JSXElement") return;
        if (!isDCGViewElement(jsxElement)) {
          return;
        }

        const attributeName = (node.name as TSESTree.JSXIdentifier).name;

        if (node.value.type === "Literal") {
          // String literals are valid for all attributes
          return;
        }

        if (node.value.type === "JSXExpressionContainer") {
          const expression = node.value.expression;

          if (expression.type === "JSXEmptyExpression") {
            return; // Skip empty expressions
          }

          // Check for DCGView.const call first (special case)
          if (
            expression.type === "CallExpression" &&
            expression.callee.type === "MemberExpression" &&
            expression.callee.object.type === "Identifier" &&
            expression.callee.object.name === "DCGView" &&
            expression.callee.property.type === "Identifier" &&
            expression.callee.property.name === "const"
          ) {
            return; // Valid DCGView.const call
          }

          // Check for this.const() call (DCGView helper method)
          if (
            expression.type === "CallExpression" &&
            expression.callee.type === "MemberExpression" &&
            expression.callee.object.type === "ThisExpression" &&
            expression.callee.property.type === "Identifier" &&
            expression.callee.property.name === "const"
          ) {
            return; // Valid this.const call
          }

          // Check for this.bindFn() call (DCGView helper method)
          if (
            expression.type === "CallExpression" &&
            expression.callee.type === "MemberExpression" &&
            expression.callee.object.type === "ThisExpression" &&
            expression.callee.property.type === "Identifier" &&
            expression.callee.property.name === "bindFn"
          ) {
            return; // Valid this.bindFn call
          }

          // Check for function calls (not allowed as direct bindings)
          if (expression.type === "CallExpression") {
            // Special case: .bind() calls return functions and are valid bindings
            if (
              expression.callee.type === "MemberExpression" &&
              expression.callee.property.type === "Identifier" &&
              expression.callee.property.name === "bind"
            ) {
              return; // Valid .bind() call
            }

            const sourceCode = context.sourceCode;
            const expressionText = sourceCode.getText(expression);

            context.report({
              node: expression,
              messageId: "functionCallNotAllowed",
              suggest: [
                {
                  messageId: "suggestGetter",
                  data: { attributeName, value: expressionText },
                  fix(fixer) {
                    return fixer.replaceText(
                      expression,
                      `() => ${expressionText}`,
                    );
                  },
                },
              ],
            });
            return;
          }

          // Use TypeScript type information to determine if this is a valid binding
          if (isFunctionType(expression)) {
            return; // Valid function binding (getter, event handler, etc.)
          }

          // If it's not a function type, it's invalid
          const sourceCode = context.sourceCode;
          const expressionText = sourceCode.getText(expression);

          context.report({
            node: expression,
            messageId: "nonFunctionExpression",
            suggest: [
              {
                messageId: "suggestGetter",
                data: { attributeName, value: expressionText },
                fix(fixer) {
                  return fixer.replaceText(
                    expression,
                    `() => ${expressionText}`,
                  );
                },
              },
              {
                messageId: "suggestDCGViewConst",
                data: { value: expressionText },
                fix(fixer) {
                  if (
                    expression.type === "Identifier" ||
                    expression.type === "Literal" ||
                    expression.type === "TemplateLiteral"
                  ) {
                    return fixer.replaceText(
                      expression,
                      `DCGView.const(${expressionText})`,
                    );
                  }
                  return null;
                },
              },
            ],
          });
        }
      },
    };
  },
});
