import { NotesApp } from "@/components/notes-app";
import { Toaster } from "@/components/ui/sonner";

export default function Home() {
  return (
    <>
      <NotesApp />
      <Toaster />
    </>
  );
}
