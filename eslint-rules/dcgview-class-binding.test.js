import { RuleTester } from 'eslint';
import { dcgviewClassBindingRule } from './dcgview-class-binding.js';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

ruleTester.run('dcgview-class-binding', dcgviewClassBindingRule, {
  valid: [
    // String literal
    '<div class="valid-class" />',

    // Inline getter function
    '<div class={() => "valid-class"} />',
    '<div class={() => someVariable} />',
    '<div class={() => { return "class"; }} />',

    // Function expression
    '<div class={function() { return "class"; }} />',

    // Identifier (getter function)
    '<div class={getter} />',
    '<div class={getClassName} />',

    // DCGView.const
    '<div class={DCGView.const("static-class")} />',
    '<div class={DCGView.const(someVariable)} />',

    // No class attribute
    '<div />',
    '<div id="test" />',
  ],

  invalid: [
    {
      code: '<div class={"string-literal"} />',
      errors: [{
        messageId: 'invalidClassBinding',
      }],
    },
    {
      code: '<div class={`template-literal`} />',
      errors: [{
        messageId: 'invalidClassBinding',
      }],
    },
    {
      code: '<div class={someFunction()} />',
      errors: [{
        messageId: 'invalidClassBinding',
      }],
    },
    {
      code: '<div class={styles.className} />',
      errors: [{
        messageId: 'invalidClassBinding',
      }],
    },
  ],
});

console.log('All tests passed!');
