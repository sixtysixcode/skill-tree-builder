import { AppNode } from "../types/skillTypes";

// Small helper so TS knows when we have a SkillNode (in future we could have different node types)
export const isSkillNode = (node: AppNode): boolean => {
    return node.type === 'skill';
}

export const shallowEqual = (a: string[], b: string[]) =>
    a.length === b.length && a.every((id, i) => id === b[i]);