import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "An error occurred while loading this content.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <Card className={`border-red-200 bg-red-50 ${className}`}>
      <CardContent className="flex flex-col items-center justify-center p-6 text-center">
        <div className="rounded-full bg-red-100 p-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-red-900 mb-2">{title}</h3>
        <p className="text-sm text-red-700 mb-6 max-w-sm">{message}</p>
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
            className="border-red-200 hover:bg-red-100 hover:text-red-900"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
