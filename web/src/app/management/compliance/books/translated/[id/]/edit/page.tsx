import React from "react";
import TranslatedBookForm from "@/components/management/TranslatedBookForm";

interface EditTranslatedBookPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTranslatedBookPage({ params }: EditTranslatedBookPageProps) {
  const { id } = await params;
  
  return (
    <main className="relative overflow-hidden">
      <div className="site-shell mx-auto px-4 py-12 sm:px-8">
        <TranslatedBookForm bookId={id} />
      </div>
    </main>
  );
}
