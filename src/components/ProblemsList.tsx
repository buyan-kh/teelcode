import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Input } from "./ui/input";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Trophy,
  Star,
} from "lucide-react";
import { LeetCodeProblem, leetcodeProblems } from "../data/leetcode-problems";
import { ProblemModal } from "./ProblemModal";

// ELO calculation removed - no longer tracking user ELO

const STAR_KEY = "starredProblems";
function readStarred(): Record<number, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STAR_KEY) || "{}");
  } catch {
    return {} as Record<number, boolean>;
  }
}
function writeStarred(map: Record<number, boolean>) {
  localStorage.setItem(STAR_KEY, JSON.stringify(map));
}

// Persist ratings so other components (e.g., RightSidebar) can compute progress
const RATING_KEY = "problemRatings";
type RatingMap = Record<number, string | null>;
function readRatings(): RatingMap {
  try {
    return JSON.parse(localStorage.getItem(RATING_KEY) || "{}");
  } catch {
    return {} as RatingMap;
  }
}
function writeRatings(map: RatingMap) {
  localStorage.setItem(RATING_KEY, JSON.stringify(map));
  // Notify listeners in this tab to update derived UI (progress, counts)
  try {
    window.dispatchEvent(new Event("problem-ratings-changed"));
  } catch {}
}

// Recall tracking: when a problem is rated as lemon/broccoli it appears in recall with a due date
type RecallType = "challenging" | "incomprehensible";
interface RecallEntry {
  type: RecallType;
  assignedAt: number; // epoch ms when it was last set to recall
}
const RECALL_KEY = "problemRecalls";
function readRecalls(): Record<number, RecallEntry> {
  try {
    return JSON.parse(localStorage.getItem(RECALL_KEY) || "{}");
  } catch {
    return {} as Record<number, RecallEntry>;
  }
}
function writeRecalls(map: Record<number, RecallEntry>) {
  localStorage.setItem(RECALL_KEY, JSON.stringify(map));
  try {
    window.dispatchEvent(new Event("problem-recalls-changed"));
  } catch {}
}

// Graduations: distinct problems that moved from lemon/broccoli to apples (red/green)
const GRADUATED_SET_KEY = "recallGraduatedIds";
function readGraduatedSet(): Record<number, boolean> {
  try {
    return JSON.parse(localStorage.getItem(GRADUATED_SET_KEY) || "{}");
  } catch {
    return {} as Record<number, boolean>;
  }
}
function writeGraduatedSet(map: Record<number, boolean>) {
  localStorage.setItem(GRADUATED_SET_KEY, JSON.stringify(map));
  try {
    window.dispatchEvent(new Event("problem-recalls-changed"));
  } catch {}
}

interface ProblemData {
  notes: string;
  rating: string | null;
  starred?: boolean;
}

type ProblemsListProps = {
  filterStarredOnly?: boolean;
  filterRecallType?: "challenging" | "incomprehensible";
};

export function ProblemsList({
  filterStarredOnly = false,
  filterRecallType,
}: ProblemsListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [minRating, setMinRating] = useState("");
  const [maxRating, setMaxRating] = useState("");
  const [selectedProblem, setSelectedProblem] =
    useState<LeetCodeProblem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [problemData, setProblemData] = useState<Record<number, ProblemData>>(
    {}
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null
  );

  // Solved problems tracking (no ELO calculation)
  const [solvedProblems, setSolvedProblems] = useState<Set<number>>(new Set());

  // Load solved problems from storage
  useEffect(() => {
    try {
      const savedSolved = localStorage.getItem("solvedProblems");

      if (savedSolved) {
        const solvedArray = JSON.parse(savedSolved);
        setSolvedProblems(new Set(solvedArray));
      }
    } catch (error) {
      console.error("Error loading solved problems:", error);
    }
  }, []);

  // Initialize starred state from storage
  useEffect(() => {
    const starred = readStarred();
    if (Object.keys(starred).length === 0) return;
    setProblemData((prev) => {
      const next = { ...prev } as Record<number, ProblemData>;
      for (const [idStr, is] of Object.entries(starred)) {
        const id = Number(idStr);
        next[id] = {
          notes: next[id]?.notes || "",
          rating: next[id]?.rating || null,
          starred: !!is,
        };
      }
      return next;
    });
  }, []);

  // Initialize ratings state from storage so it persists between sessions
  useEffect(() => {
    const ratings = readRatings();
    if (Object.keys(ratings).length === 0) return;
    setProblemData((prev) => {
      const next = { ...prev } as Record<number, ProblemData>;
      for (const [idStr, rating] of Object.entries(ratings)) {
        const id = Number(idStr);
        next[id] = {
          notes: next[id]?.notes || "",
          rating: (rating as string) || null,
          starred: next[id]?.starred || false,
        };
      }
      return next;
    });
  }, []);

  // Listen for global open-problem requests (from RightSidebar recalls etc.)
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ id: number }>;
      const problem = leetcodeProblems.find((p) => p.id === custom.detail?.id);
      if (problem) {
        setSelectedProblem(problem);
        setIsModalOpen(true);
      }
    };
    window.addEventListener("open-problem", handler as EventListener);
    return () =>
      window.removeEventListener("open-problem", handler as EventListener);
  }, []);

  // Compute base dataset with optional star and recall filters
  const baseProblems = useMemo(() => {
    let base = leetcodeProblems;
    if (filterStarredOnly) {
      const starMap = Object.keys(problemData).length
        ? Object.fromEntries(
            Object.entries(problemData).map(([k, v]) => [
              Number(k),
              !!v.starred,
            ])
          )
        : readStarred();
      const starIds = new Set(
        Object.entries(starMap)
          .filter(([, val]) => !!val)
          .map(([id]) => Number(id))
      );
      base = base.filter((p) => starIds.has(p.id));
    }

    if (filterRecallType) {
      const recalls = readRecalls();
      const ids = new Set(
        Object.entries(recalls)
          .filter(([, entry]) => (entry as any).type === filterRecallType)
          .map(([id]) => Number(id))
      );
      base = base.filter((p) => ids.has(p.id));
    }

    return base;
  }, [filterStarredOnly, problemData, filterRecallType]);

  const filteredProblems = useMemo(() => {
    return baseProblems.filter((problem) => {
      const min = minRating ? parseInt(minRating, 10) : 0;
      const max = maxRating ? parseInt(maxRating, 10) : Infinity;
      return problem.eloScore >= min && problem.eloScore <= max;
    });
  }, [baseProblems, minRating, maxRating]);

  const sortedProblems = useMemo(() => {
    // If viewing recall lists, sort by nearest due date
    if (filterRecallType) {
      const recalls = readRecalls();
      const dueOf = (id: number) => {
        const entry = recalls[id];
        if (!entry) return Number.MAX_SAFE_INTEGER;
        const daysDelay = entry.type === "incomprehensible" ? 5 : 3;
        return entry.assignedAt + daysDelay * 24 * 60 * 60 * 1000;
      };
      return [...filteredProblems].sort((a, b) => dueOf(a.id) - dueOf(b.id));
    }
    if (!sortDirection) return filteredProblems;
    return [...filteredProblems].sort((a, b) => {
      if (sortDirection === "asc") return a.eloScore - b.eloScore;
      return b.eloScore - a.eloScore;
    });
  }, [filteredProblems, sortDirection, filterRecallType]);

  const totalPages = Math.ceil(sortedProblems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProblems = sortedProblems.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleProblemClick = (problem: LeetCodeProblem) => {
    setSelectedProblem(problem);
    setIsModalOpen(true);
  };

  const handleNotesChange = (notes: string) => {
    if (!selectedProblem) return;
    setProblemData((prev) => ({
      ...prev,
      [selectedProblem.id]: {
        ...prev[selectedProblem.id],
        notes,
        rating: prev[selectedProblem.id]?.rating || null,
        starred: prev[selectedProblem.id]?.starred || false,
      },
    }));
  };

  const handleRatingChange = (rating: string | null) => {
    if (!selectedProblem) return;
    setProblemData((prev) => {
      const updated = {
        ...prev,
        [selectedProblem.id]: {
          notes: prev[selectedProblem.id]?.notes || "",
          rating,
          starred: prev[selectedProblem.id]?.starred || false,
        },
      } as Record<number, ProblemData>;

      // persist to localStorage
      const currentRatings = readRatings();
      const nextRatings: RatingMap = {
        ...currentRatings,
        [selectedProblem.id]: rating,
      };
      // Do not store nulls as keys to keep storage lean
      if (rating === null) {
        delete nextRatings[selectedProblem.id];
      }
      writeRatings(nextRatings);

      // ELO calculation based on solve state change
      const problemId = selectedProblem.id;
      const previousRating = prev[selectedProblem.id]?.rating || null;

      // Determine if problem was previously solved and if it's solved now
      // In ProblemsList: "exhausting" = icecube (not solved), others = solved
      const wasSolved =
        previousRating !== null && previousRating !== "exhausting";
      const isSolvedNow = rating !== null && rating !== "exhausting";

      if (!wasSolved && isSolvedNow) {
        // Problem newly solved - just track it
        setSolvedProblems((prev) => new Set([...prev, problemId]));

        // Persist solved problems
        const updatedSolvedArray = [...solvedProblems, problemId];
        localStorage.setItem(
          "solvedProblems",
          JSON.stringify(updatedSolvedArray)
        );

        console.log(`✅ Problem ${problemId} solved!`);
      } else if (wasSolved && !isSolvedNow) {
        // Problem unrated/unsolved - remove from solved
        setSolvedProblems((prev) => {
          const updated = new Set(prev);
          updated.delete(problemId);
          return updated;
        });

        // Persist solved problems
        const updatedSolved = [...solvedProblems].filter(
          (id) => id !== problemId
        );
        localStorage.setItem("solvedProblems", JSON.stringify(updatedSolved));

        console.log(`❌ Problem ${problemId} unrated!`);
      }

      // Update recalls and graduation tracking based on transitions
      const prevRating = prev[selectedProblem.id]?.rating || null;
      const isPrevRecall =
        prevRating === "challenging" || prevRating === "incomprehensible";
      const isNowRecall =
        rating === "challenging" || rating === "incomprehensible";
      const isNowApple = rating === "yum" || rating === "desirable";

      // Read current stores
      const recalls = readRecalls();
      const graduatedSet = readGraduatedSet();

      if (isNowRecall) {
        // Assign or reassign recall with fresh timestamp and type
        const type = rating as RecallType;
        const assignedAt = Date.now();
        recalls[selectedProblem.id] = { type, assignedAt };
        writeRecalls(recalls);
        // Immediately notify listeners in this tab without relying on storage event
        try {
          window.dispatchEvent(new Event("problem-recalls-changed"));
        } catch {}
      } else {
        // If no longer recall-rated, ensure it's removed from recalls
        if (recalls[selectedProblem.id]) {
          delete recalls[selectedProblem.id];
          writeRecalls(recalls);
        }
      }

      // Graduation: transitioned from recall (lemon/broccoli) to apples (red/green)
      if (isPrevRecall && isNowApple) {
        graduatedSet[selectedProblem.id] = true;
        writeGraduatedSet(graduatedSet);
      }

      return updated;
    });
  };

  const toggleStar = (id: number) => {
    setProblemData((prev) => ({
      ...prev,
      [id]: {
        notes: prev[id]?.notes || "",
        rating: prev[id]?.rating || null,
        starred: !prev[id]?.starred,
      },
    }));
    writeStarred({ ...readStarred(), [id]: !problemData[id]?.starred });
  };

  const getRatingEmoji = (problemId: number) => {
    const rating = problemData[problemId]?.rating;
    switch (rating) {
      case "yum":
        return "🍎";
      case "desirable":
        return "🍏";
      case "challenging":
        return "🍋";
      case "incomprehensible":
        return "🥦";
      case "exhausting":
        return "🧊";
      default:
        return null;
    }
  };

  const getRatingDescription = (problemId: number) => {
    const rating = problemData[problemId]?.rating;
    switch (rating) {
      case "yum":
        return "Yum";
      case "desirable":
        return "Desirable difficulty";
      case "challenging":
        return "Pushes cognitive limits";
      case "incomprehensible":
        return "Borderline incomprehensible";
      case "exhausting":
        return "Couldn't solve";
      default:
        return null;
    }
  };

  const getRatingBadgeColor = (rating: string) => {
    switch (rating) {
      case "yum":
        return "bg-green-100 text-green-800";
      case "desirable":
        return "bg-yellow-100 text-yellow-800";
      case "challenging":
        return "bg-red-100 text-red-800";
      case "incomprehensible":
        return "bg-pink-100 text-pink-800";
      case "exhausting":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div className="flex flex-col space-y-3">
      {/* Filters - compact white bar */}
      <div className="rounded-[1.25rem] bg-white shadow-sm px-3 py-2 max-w-[760px] mx-auto w-full">
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {/* Min elo */}
          <div className="flex items-center gap-2">
            <span className="font-instrument-condensed text-xl">min elo</span>
            <Input
              placeholder="0"
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              className="h-9 w-20 rounded-full bg-[#f3f4f6] border-0"
              type="number"
              min="0"
              max="9999"
            />
          </div>
          {/* Max elo */}
          <div className="flex items-center gap-2">
            <span className="font-instrument-condensed text-xl">max elo</span>
            <Input
              placeholder="∞"
              value={maxRating}
              onChange={(e) => setMaxRating(e.target.value)}
              className="h-9 w-20 rounded-full bg-[#f3f4f6] border-0"
              type="number"
              min="0"
              max="9999"
            />
          </div>
          {/* Per page */}
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value: any) => {
              setItemsPerPage(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-36 h-9 rounded-full bg-white border border-[#e5e7eb]">
              <SelectValue placeholder="25 per page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 per page</SelectItem>
              <SelectItem value="25">25 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
              <SelectItem value="100">100 per page</SelectItem>
            </SelectContent>
          </Select>
          {/* Sort pill */}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSortDirection((prev) =>
                prev === "asc" ? "desc" : prev === "desc" ? null : "asc"
              );
              setCurrentPage(1);
            }}
            className="h-9 px-5 rounded-full bg-[#2a5de2] border-0 text-lg font-sf text-white"
          >
            Sort by
          </Button>
        </div>
      </div>

      {/* List + pagination (scroll handled by main column) */}
      <div className="flex-1 min-h-0">
        <div className="rounded-[2rem] bg-white/85 backdrop-blur-sm shadow-sm p-4 md:p-6 font-sf max-w-[760px] mx-auto w-full">
          <div className="grid gap-4">
            {paginatedProblems.map((problem, index) => {
              const userRating = problemData[problem.id]?.rating;
              const ratingDescription = getRatingDescription(problem.id);
              const isStarred = problemData[problem.id]?.starred === true;
              return (
                <Card
                  key={problem.id}
                  className={`cursor-pointer hover:shadow-md transition-shadow bg-white/80 backdrop-blur-sm ${
                    userRating
                      ? problemData[problem.id]?.rating === "exhausting"
                        ? "bg-transparent border-red-500"
                        : "bg-transparent border-green-500"
                      : ""
                  }`}
                  onClick={() => handleProblemClick(problem)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium truncate">
                            {startIndex + index + 1}. {problem.title}
                          </h3>
                          {getRatingEmoji(problem.id) && (
                            <span className="text-lg" title="Your rating">
                              {getRatingEmoji(problem.id)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                          {userRating && ratingDescription && (
                            <Badge className={getRatingBadgeColor(userRating)}>
                              {ratingDescription}
                            </Badge>
                          )}
                          <div className="flex items-center gap-1 pb-1">
                            <Trophy className="w-3 h-3" />
                            <span>{problem.eloScore}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Star button */}
                        <button
                          type="button"
                          aria-label={
                            isStarred ? "Unstar problem" : "Star problem"
                          }
                          aria-pressed={isStarred}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStar(problem.id);
                          }}
                          className="p-2 rounded-full hover:bg-muted/50 transition-colors"
                          title={isStarred ? "Starred" : "Mark as starred"}
                        >
                          <Star
                            className={
                              isStarred
                                ? "text-red-500"
                                : "text-muted-foreground"
                            }
                            fill={isStarred ? "currentColor" : "none"}
                            strokeWidth={1.8}
                            size={20}
                          />
                        </button>

                        {problemData[problem.id]?.notes && (
                          <Badge variant="outline" className="text-xs">
                            Has Notes
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination inside white container (non-sticky) */}
          {totalPages > 1 && (
            <div className="pt-4 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(pageNum)}
                      className="w-10"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <ProblemModal
        problem={selectedProblem}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        notes={
          selectedProblem ? problemData[selectedProblem.id]?.notes || "" : ""
        }
        onNotesChange={handleNotesChange}
        rating={
          selectedProblem
            ? problemData[selectedProblem.id]?.rating || null
            : null
        }
        onRatingChange={handleRatingChange}
      />
    </div>
  );
}
