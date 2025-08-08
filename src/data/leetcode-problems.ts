export interface LeetCodeProblem {
  id: number;
  title: string;
  topics: string[];
  companies: string[];
  eloScore: number;
  problemUrl: string;
  solutionVideoUrl: string;
}

import rawData from "./data.json";

export const leetcodeProblems: LeetCodeProblem[] = rawData.map((problem) => ({
  id: problem.ID,
  title: problem.Title,
  topics: [],
  companies: [],
  eloScore: Math.round(problem.Rating),
  problemUrl: `https://leetcode.com/problems/${problem.TitleSlug}/`,
  solutionVideoUrl: "",
}));
