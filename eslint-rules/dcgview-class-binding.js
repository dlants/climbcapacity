export const dcgviewClassBindingRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce correct DCGView class binding patterns',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    hasSuggestions: true,
    schema: [],
    messages: {
      invalidClassBinding: 'Invalid class binding in DCGView. Use string literal, getter function, or DCGView.const() for static values.',
      suggestGetter: 'Consider wrapping in a getter function: class={() => value}',
      suggestDCGViewConst: 'For static values, consider using DCGView.const(value)',
    },
  },

  create(context) {
    return {
      JSXAttribute(node) {
        // Only check 'class' attributes
        if (!node.name || node.name.name !== 'class') {
          return;
        }

        // Skip if no value (e.g., <div class />)
        if (!node.value) {
          return;
        }

        // Valid patterns:
        // 1. String literal: class="string"
        // 2. Inline getter function: class={() => "string"}
        // 3. Function expression: class={function() { return "string"; }}
        // 4. Identifier (getter function): class={getter}
        // 5. DCGView.const: class={DCGView.const("string")}

        if (node.value.type === 'Literal') {
          // String literal is valid: class="string"
          return;
        }

        if (node.value.type === 'JSXExpressionContainer') {
          const expression = node.value.expression;

          // Check for inline getter function: () => ...
          if (expression.type === 'ArrowFunctionExpression' && expression.params.length === 0) {
            return; // Valid inline getter function
          }

          // Check for function expression: function() { ... }
          if (expression.type === 'FunctionExpression' && expression.params.length === 0) {
            return; // Valid function expression
          }

          // Check for identifier that references a getter function
          if (expression.type === 'Identifier') {
            // We'll allow identifiers since they could be getter functions
            // The actual validation of whether it's a getter would need runtime/type checking
            return; // Valid identifier (assumed to be a getter function)
          }

          // Check for DCGView.const call
          if (expression.type === 'CallExpression' &&
            expression.callee.type === 'MemberExpression' &&
            expression.callee.object.name === 'DCGView' &&
            expression.callee.property.name === 'const') {
            return; // Valid DCGView.const call
          }

          // Invalid patterns:
          // - Direct expression: class={variable}
          // - String template: class={`string`}
          // - Any other expression that's not a getter or DCGView.const

          const sourceCode = context.getSourceCode();
          const expressionText = sourceCode.getText(expression);

          context.report({
            node: expression,
            messageId: 'invalidClassBinding',
            data: {
              value: expressionText,
            },
            suggest: [
              {
                messageId: 'suggestGetter',
                data: { value: expressionText },
                fix(fixer) {
                  return fixer.replaceText(expression, `() => ${expressionText}`);
                },
              },
              {
                messageId: 'suggestDCGViewConst',
                data: { value: expressionText },
                fix(fixer) {
                  // Only suggest DCGView.const for simple cases
                  if (expression.type === 'Identifier' ||
                    expression.type === 'Literal' ||
                    expression.type === 'TemplateLiteral') {
                    return fixer.replaceText(expression, `DCGView.const(${expressionText})`);
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
};
