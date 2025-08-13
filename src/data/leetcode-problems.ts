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
import topicsData from "./data1.json";

// Build a map from problem ID to topics from the extended dataset
const idToTopics: Record<number, string[]> = (() => {
  try {
    const map: Record<number, string[]> = {};
    (topicsData as any[]).forEach((entry: any) => {
      const id = Number(entry?.ID);
      const topics = Array.isArray(entry?.Topics)
        ? (entry.Topics as string[])
        : [];
      if (!Number.isNaN(id)) map[id] = topics;
    });
    return map;
  } catch {
    return {} as Record<number, string[]>;
  }
})();

export const leetcodeProblems: LeetCodeProblem[] = rawData.map((problem) => ({
  id: problem.ID,
  title: problem.Title,
  topics: idToTopics[problem.ID] || [],
  companies: [],
  eloScore: Math.round(problem.Rating),
  problemUrl: `https://leetcode.com/problems/${problem.TitleSlug}/`,
  solutionVideoUrl: "",
}));
