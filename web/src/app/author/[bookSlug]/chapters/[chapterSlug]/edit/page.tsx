import { auth } from "@/lib/auth-utils"
import { redirect, notFound } from "next/navigation"
import { EditChapterForm } from "@/components/editor/EditChapterForm"
import { getApiUrl } from "@/lib/config"

export const metadata = {
  title: "Bölüm Düzenle | Epiknovel",
}

export default async function EditChapterPage({ params }: { params: Promise<{ bookSlug: string, chapterSlug: string }> }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { bookSlug, chapterSlug } = await params
  const apiUrl = process.env.NEXT_INTERNAL_API_URL || "http://epiknovel_api:8080/api"

  // Fetch Chapter Details
  // Backend reader-side endpoint: /api/books/chapters/{Slug}
  const res = await fetch(`${apiUrl}/books/chapters/${chapterSlug}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: 'no-store'
  })

  if (!res.ok) {
    if (res.status === 404) notFound()
    throw new Error("Bölüm yüklenemedi")
  }

  const result = await res.json()
  if (!result.isSuccess) notFound()

  // Fetch Book Details for ID and Title
  const bookRes = await fetch(`${apiUrl}/Books/${bookSlug}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    next: { revalidate: 0 }
  })
  
  let bookTitle = ""
  let bookId = ""
  if (bookRes.ok) {
    const bookData = await bookRes.json()
    if (bookData.isSuccess) {
      bookTitle = bookData.data.title
      bookId = bookData.data.id
    }
  }

  const chapterData = result.data

  return (
    <div className="min-h-screen bg-base-200">
      <EditChapterForm 
        bookId={bookId || bookSlug} 
        chapterId={chapterData.id} 
        initialData={{
          ...chapterData,
          paragraphs: chapterData.lines // In v2, lines are mapped to paragraphs
        }} 
        nextOrder={chapterData.order} 
        bookTitle={bookTitle}
        bookSlug={bookSlug}
      />
    </div>
  )
}
