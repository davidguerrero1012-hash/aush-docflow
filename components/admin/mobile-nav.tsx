"use client";

import { useState } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { AdminNav } from "./admin-nav";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="left">
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-full w-64 rounded-none">
        <div className="absolute right-3 top-3">
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close menu">
              <X className="h-4 w-4" />
            </Button>
          </DrawerClose>
        </div>
        <div className="h-full" onClick={() => setOpen(false)}>
          <AdminNav />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
