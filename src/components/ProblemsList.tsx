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
  ArrowUpDown,
  Star,
} from "lucide-react";
import { LeetCodeProblem, leetcodeProblems } from "../data/leetcode-problems";
import { ProblemModal } from "./ProblemModal";

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

interface ProblemData {
  notes: string;
  rating: string | null;
  starred?: boolean;
}

type ProblemsListProps = {
  filterStarredOnly?: boolean;
};

export function ProblemsList({ filterStarredOnly = false }: ProblemsListProps) {
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

  // Compute base dataset with optional star filter
  const baseProblems = useMemo(() => {
    if (!filterStarredOnly) return leetcodeProblems;
    const starMap = Object.keys(problemData).length
      ? Object.fromEntries(
          Object.entries(problemData).map(([k, v]) => [Number(k), !!v.starred])
        )
      : readStarred();
    const starIds = new Set(
      Object.entries(starMap)
        .filter(([, val]) => !!val)
        .map(([id]) => Number(id))
    );
    return leetcodeProblems.filter((p) => starIds.has(p.id));
  }, [filterStarredOnly, problemData]);

  const filteredProblems = useMemo(() => {
    return baseProblems.filter((problem) => {
      const min = minRating ? parseInt(minRating, 10) : 0;
      const max = maxRating ? parseInt(maxRating, 10) : Infinity;
      return problem.eloScore >= min && problem.eloScore <= max;
    });
  }, [baseProblems, minRating, maxRating]);

  const sortedProblems = useMemo(() => {
    if (!sortDirection) return filteredProblems;
    return [...filteredProblems].sort((a, b) => {
      if (sortDirection === "asc") return a.eloScore - b.eloScore;
      return b.eloScore - a.eloScore;
    });
  }, [filteredProblems, sortDirection]);

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
    setProblemData((prev) => ({
      ...prev,
      [selectedProblem.id]: {
        notes: prev[selectedProblem.id]?.notes || "",
        rating,
        starred: prev[selectedProblem.id]?.starred || false,
      },
    }));
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
        return "Mentally exhausting";
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
    <div className="h-full flex flex-col overflow-hidden space-y-3">
      {/* Filters - compact white bar */}
      <div className="rounded-[1.25rem] bg-white shadow-sm px-3 py-2">
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
            className="h-9 px-5 rounded-full bg-[#F5F3FF] border-0 text-xl font-instrument-condensed"
          >
            sort by
          </Button>
        </div>
      </div>

      {/* Scrollable list + pagination */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="rounded-[2rem] bg-white/85 backdrop-blur-sm shadow-sm p-4 md:p-6 font-sf">
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
                      ? "bg-green-50 dark:bg-transparent dark:border-green-500"
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
                          <div className="flex items-center gap-1">
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
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-4">
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
