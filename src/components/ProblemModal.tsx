import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter, 
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { ExternalLink, Video, BookOpen, Trophy, Save } from "lucide-react";
import { LeetCodeProblem } from "../data/leetcode-problems";

interface ProblemModalProps {
  problem: LeetCodeProblem | null;
  isOpen: boolean;
  onClose: () => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  rating: string | null;
  onRatingChange: (rating: string | null) => void;
}

const ratingOptions = [
  { value: "yum", label: "🍎", description: "Yum" },
  { value: "desirable", label: "🍏", description: "Desirable difficulty" },
  { value: "challenging", label: "🍋", description: "Pushes cognitive limits" },
  {
    value: "incomprehensible",
    label: "🥦",
    description: "Borderline incomprehensible",
  },
  { value: "exhausting", label: "🧊", description: "Mentally exhausting" },
];

export function ProblemModal({
  problem,
  isOpen,
  onClose,
  notes,
  onNotesChange,
  rating,
  onRatingChange,
}: ProblemModalProps) {
  if (!problem) return null;

  const getRatingDescription = (ratingValue: string | null) => {
    if (!ratingValue) return null;
    const ratingOption = ratingOptions.find(
      (option) => option.value === ratingValue
    );
    return ratingOption ? ratingOption.description : null;
  };

  const getRatingBadgeColor = (ratingValue: string) => {
    switch (ratingValue) {
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

  const getRatingButtonColor = (optionValue: string, isSelected: boolean) => {
    if (!isSelected) return "border-border";

    switch (optionValue) {
      case "yum":
        return "bg-green-500 hover:bg-green-600 text-white border-green-500";
      case "desirable":
        return "bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500";
      case "challenging":
        return "bg-red-500 hover:bg-red-600 text-white border-red-500";
      case "incomprehensible":
        return "bg-pink-500 hover:bg-pink-600 text-white border-pink-500";
      case "exhausting":
        return "bg-purple-500 hover:bg-purple-600 text-white border-purple-500";
      default:
        return "border-border";
    }
  };

  const handleSave = () => {
    // In a real app, this would save to a backend or local storage
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl pr-8">{problem.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Problem Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              {rating && (
                <Badge className={getRatingBadgeColor(rating)}>
                  {getRatingDescription(rating)}
                </Badge>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Trophy className="w-4 h-4" />
                <span>ELO: {problem.eloScore}</span>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="space-y-2">
            <h4>Resources</h4>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" asChild>
                <a
                  href={problem.problemUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Problem
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={problem.solutionVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Video className="w-4 h-4 mr-2" />
                  Solution Video
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </Button>
            </div>
          </div>

          {/* Rating */}
          <div className="space-y-3">
            <h4>Your Rating</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
              {ratingOptions.map((option) => {
                const isSelected = rating === option.value;
                return (
                  <Button
                    key={option.value}
                    variant={isSelected ? "default" : "outline"}
                    onClick={() =>
                      onRatingChange(rating === option.value ? null : option.value)
                    }
                    className={`h-auto p-4 flex flex-col items-center text-center min-h-[80px] w-full ${
                      isSelected
                        ? getRatingButtonColor(option.value, true)
                        : "hover:bg-accent"
                    }`}
                  >
                    <div className="text-2xl mb-2">{option.label}</div>
                    <div className="text-xs opacity-80 text-center leading-tight">
                      {option.description}
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <h4>Your Notes</h4>
            <Textarea
              placeholder="Add your notes, approach, or thoughts about this problem..."
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
