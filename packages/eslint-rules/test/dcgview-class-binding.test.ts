import { describe } from "vitest";
import { RuleTester } from "@typescript-eslint/rule-tester";
import * as parser from "@typescript-eslint/parser";
import { dcgviewClassBindingRule } from "../src/dcgview-class-binding.js";
import "./test-setup";

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      projectService: {
        allowDefaultProject: ["*.ts*"],
      },
      tsconfigRootDir: import.meta.dirname + "/fixtures",
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

describe("dcgview-class-binding", () => {
  ruleTester.run("dcgview-class-binding", dcgviewClassBindingRule, {
    valid: [
      {
        code: '<div class="valid-class" />',
        name: "String literals allowed for class attribute",
      },
      {
        code: '<div href="link" />',
        name: "String literals allowed for all attributes",
      },
      {
        code: '<div class={() => "valid-class"} />',
        name: "Function expressions valid for class",
      },
      {
        code: '<div href={() => "link"} />',
        name: "Function expressions valid for other attributes",
      },
      {
        code: 'const getClassName = () => "active"; <div class={getClassName} />',
        name: "Function references valid",
      },
      {
        code: "const handleClick = (e) => {}; <div onClick={handleClick} />",
        name: "Event handler references valid",
      },
      {
        code: '<div class={DCGView.const("static-class")} />',
        name: "DCGView.const valid for class",
      },
      {
        code: '<div href={DCGView.const("link")} />',
        name: "DCGView.const valid for other attributes",
      },
      {
        code: "<div didMount={this.divDidMount.bind(this)} />",
        name: "Method binding with .bind() is valid",
      },
      {
        code: '<div class={this.const("static-class")} />',
        name: "this.const valid for class attribute",
      },
      {
        code: '<div href={this.const("link")} />',
        name: "this.const valid for other attributes",
      },
      {
        code: "<div onClick={this.bindFn(this.handleClick)} />",
        name: "this.bindFn valid for event handlers",
      },
    ],
    invalid: [
      {
        code: 'const someVariable = "not-a-function"; <div href={someVariable} />',
        errors: [
          {
            messageId: "nonFunctionExpression",
            suggestions: [
              {
                messageId: "suggestGetter",
                output:
                  'const someVariable = "not-a-function"; <div href={() => someVariable} />',
              },
              {
                messageId: "suggestDCGViewConst",
                output:
                  'const someVariable = "not-a-function"; <div href={DCGView.const(someVariable)} />',
              },
            ],
          },
        ],
        name: "Non-function expressions not allowed",
      },
      {
        code: 'const someFunction = () => "result"; <div class={someFunction()} />',
        errors: [
          {
            messageId: "functionCallNotAllowed",
            suggestions: [
              {
                messageId: "suggestGetter",
                output:
                  'const someFunction = () => "result"; <div class={() => someFunction()} />',
              },
            ],
          },
        ],
        name: "Function calls not allowed",
      },
    ],
  });
});
