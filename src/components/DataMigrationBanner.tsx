import React, { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Upload, X, Check, AlertCircle } from "lucide-react";
import { useData } from "../contexts/DataContext";

export function DataMigrationBanner() {
  const { isDataMigrated, migrateLegacyData } = useData();
  const [isVisible, setIsVisible] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);

  // Check if there's legacy data to migrate
  const hasLegacyData =
    localStorage.getItem("problemRatings") ||
    localStorage.getItem("starredProblems") ||
    localStorage.getItem("userElo") ||
    localStorage.getItem("marathonSessions");

  // Don't show banner if no legacy data or already migrated or user dismissed
  if (!hasLegacyData || isDataMigrated || !isVisible || migrationComplete) {
    return null;
  }

  const handleMigrate = async () => {
    setIsMigrating(true);
    try {
      const success = await migrateLegacyData();
      if (success) {
        setMigrationComplete(true);
        // Clear legacy data after successful migration
        setTimeout(() => {
          localStorage.removeItem("problemRatings");
          localStorage.removeItem("starredProblems");
          localStorage.removeItem("userElo");
          localStorage.removeItem("marathonSessions");
          localStorage.removeItem("problemRecalls");
          localStorage.removeItem("problemEloGains");
          localStorage.removeItem("solvedProblems");
          console.log("✅ Legacy data cleared after migration");
        }, 2000);
      }
    } catch (error) {
      console.error("Migration failed:", error);
    } finally {
      setIsMigrating(false);
    }
  };

  if (migrationComplete) {
    return (
      <div className="w-full max-w-4xl mx-auto mb-4">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-green-800">
                  Migration Successful!
                </h3>
                <p className="text-sm text-green-700">
                  Your local data has been successfully moved to the cloud. Your
                  progress is now synced across all devices.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMigrationComplete(false)}
                className="text-green-600 hover:text-green-800"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto mb-4">
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-800 mb-1">
                Local Data Detected
              </h3>
              <p className="text-sm text-blue-700 mb-3">
                We found your previous progress stored locally. Would you like
                to sync it to the cloud? This will make your data available
                across all devices and ensure it's safely backed up.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleMigrate}
                  disabled={isMigrating}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isMigrating ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                      Migrating...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3 w-3 mr-2" />
                      Sync to Cloud
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsVisible(false)}
                  disabled={isMigrating}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Skip for now
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              disabled={isMigrating}
              className="text-blue-600 hover:text-blue-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
