import { useNavigate } from "react-router-dom";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-primary">
        <Compass className="h-8 w-8" aria-hidden />
      </span>
      <p className="mt-6 text-5xl font-extrabold tracking-tight text-foreground">404</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Page not found</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        The page you're looking for doesn't exist or may have moved.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={() => navigate("/")}>Back to home</Button>
        <Button variant="outline" onClick={() => navigate("/courses")}>
          Browse courses
        </Button>
      </div>
    </div>
  );
}
