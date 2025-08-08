import { useState, useMemo } from "react";
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
} from "lucide-react";
import { ModeToggle } from "./mode-toggle";
import { LeetCodeProblem, leetcodeProblems } from "../data/leetcode-problems";
import { ProblemModal } from "./ProblemModal";

interface ProblemData {
  notes: string;
  rating: string | null;
}

export function ProblemsList() {
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

  const filteredProblems = useMemo(() => {
    return leetcodeProblems.filter((problem) => {
      const min = minRating ? parseInt(minRating) : 0;
      const max = maxRating ? parseInt(maxRating) : Infinity;
      return problem.eloScore >= min && problem.eloScore <= max;
    });
  }, [minRating, maxRating]);

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
      },
    }));
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
        return "bg-green-100 text-green-800"; // red apple - green
      case "desirable":
        return "bg-yellow-100 text-yellow-800"; // green apple - yellow
      case "challenging":
        return "bg-red-100 text-red-800"; // lemon - red
      case "incomprehensible":
        return "bg-pink-100 text-pink-800"; // broccoli - pink
      case "exhausting":
        return "bg-purple-100 text-purple-800"; // ice cube - purple
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">TeelCode</h1>
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-
            {startIndex + paginatedProblems.length} of {filteredProblems.length}{" "}
            problems
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 grid grid-cols-2 gap-4">
            <Input
              placeholder="Min Rating"
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
            />
            <Input
              placeholder="Max Rating"
              value={maxRating}
              onChange={(e) => setMaxRating(e.target.value)}
            />
          </div>

          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value: string) => {
              setItemsPerPage(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 per page</SelectItem>
              <SelectItem value="25">25 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
              <SelectItem value="100">100 per page</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => {
              setSortDirection((prev) =>
                prev === "asc" ? "desc" : prev === "desc" ? null : "asc"
              );
              setCurrentPage(1);
            }}
            className="w-full sm:w-auto"
          >
            <ArrowUpDown className="w-4 h-4 mr-2" />
            Sort by Rating{" "}
            {sortDirection === "asc"
              ? "↑"
              : sortDirection === "desc"
              ? "↓"
              : ""}
          </Button>
          <ModeToggle />
        </div>
      </div>

      {/* Problems Grid */}
      <div className="grid gap-4">
        {paginatedProblems.map((problem, index) => {
          const userRating = problemData[problem.id]?.rating;
          const ratingDescription = getRatingDescription(problem.id);

          return (
            <Card
              key={problem.id}
              className={`cursor-pointer hover:shadow-md transition-shadow ${
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

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
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

      {/* Problem Modal */}
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
