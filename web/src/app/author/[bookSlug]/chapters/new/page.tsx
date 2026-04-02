import { auth } from "@/lib/auth-utils"
import { redirect } from "next/navigation"
import { EditChapterForm } from "@/components/editor/EditChapterForm"
import { getApiUrl } from "@/lib/config"

export const metadata = {
  title: "Yeni Bölüm Yaz | Epiknovel",
}

export default async function NewChapterPage({ params }: { params: Promise<{ bookSlug: string }> }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { bookSlug } = await params
  const apiUrl = process.env.NEXT_INTERNAL_API_URL || "http://epiknovel_api:8080/api"

  let nextOrder = 1
  let bookTitle = ""
  let bookType = 0
  let bookId = ""

  try {
    // Fetch book details to get internal ID and next order
    const bookRes = await fetch(`${apiUrl}/Books/${bookSlug}`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      next: { revalidate: 0 }
    })
    
    if (bookRes.ok) {
      const bookData = await bookRes.json()
      if (bookData.isSuccess) {
        bookTitle = bookData.data.title
        bookType = bookData.data.type
        bookId = bookData.data.id
      }
    }

    // Fetch chapters to calculate next order
    const res = await fetch(`${apiUrl}/Books/${bookSlug}/chapters?IncludeDrafts=true&pageSize=1000`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      next: { revalidate: 0 }
    })
    
    if (res.ok) {
      const data = await res.json()
      if (data.isSuccess) {
        const chapters = data.data?.items || data.data || []
        if (Array.isArray(chapters) && chapters.length > 0) {
          nextOrder = Math.max(...chapters.map((c: any) => c.order || 0)) + 1
        }
      }
    }
  } catch (err) {
    console.error("Data fetch error for new chapter:", err)
  }

  return (
    <div className="min-h-screen bg-base-200">
      <EditChapterForm 
        bookId={bookId || bookSlug} 
        nextOrder={nextOrder} 
        bookTitle={bookTitle} 
        bookType={bookType} 
        bookSlug={bookSlug} 
      />
    </div>
  )
}
