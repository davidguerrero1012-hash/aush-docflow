"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
 children: ReactNode;
 fallbackMessage?: string;
}

interface State {
 hasError: boolean;
 error: Error | null;
}

export class OcrErrorBoundary extends Component<Props, State> {
 constructor(props: Props) {
  super(props);
  this.state = { hasError: false, error: null };
 }

 static getDerivedStateFromError(error: Error): State {
  return { hasError: true, error };
 }

 handleRetry = () => {
  this.setState({ hasError: false, error: null });
 };

 render() {
  if (this.state.hasError) {
   return (
    <div className=" border border-red-200 bg-red-50 p-6 text-center">
     <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-red-400" />
     <h3 className="text-sm font-semibold text-red-800">
      OCR Processing Error
     </h3>
     <p className="mt-1 text-sm text-red-600">
      {this.props.fallbackMessage ||
       "OCR processing encountered an error. Please fill in the fields manually."}
     </p>
     <Button
      type="button"
      variant="outline"
      onClick={this.handleRetry}
      className="mt-4 h-9 border-red-200 text-red-700 hover:bg-red-100"
     >
      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
      Try Again
     </Button>
    </div>
   );
  }

  return this.props.children;
 }
}
