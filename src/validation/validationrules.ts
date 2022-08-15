import { ValidationLevel } from "../types";
import { IBoard } from "../boards";
import { IBoardInfo } from "../adapter/boardinfobase";

const _rules: { [name: string]: IValidationRule } = Object.create(null);

type ValidationReturnType = false | string;

export interface IValidationContext {
  board: IBoard;
  boardInfo: IBoardInfo;
}

export interface IValidationRule<TContext = unknown> {
  id: string;
  name: string;
  level: ValidationLevel;
  fails(
    context: IValidationContext,
    args?: TContext
  ): ValidationReturnType | Promise<ValidationReturnType>;
}

const ValidationRuleBase: IValidationRule = {
  id: "",
  name: "",
  level: ValidationLevel.ERROR,
  fails: function (
    context,
    args
  ): ValidationReturnType | Promise<ValidationReturnType> {
    throw new Error("fails not implemented");
  },
};

export function createRule<TContext = unknown>(
  id: string,
  name: string,
  level: ValidationLevel
): IValidationRule<TContext> {
  let rule = Object.create(ValidationRuleBase);
  rule.id = id;
  rule.name = name;
  rule.level = level;
  _rules[id] = rule;
  return rule;
}

// var NAMEHERE = createRule("", "");
// NAMEHERE.fails = function(board: IBoard, args: any) {

// };

export function getRule(id: string, args?: any): IValidationRule {
  let rule = _rules[id];
  let newRule = {
    id: rule.id,
    name: rule.name,
    level: rule.level,
    fails: function (context: IValidationContext) {
      return rule.fails(context, args);
    },
  };
  return newRule;
}
