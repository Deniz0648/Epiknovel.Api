'use server'

import { revalidatePath } from 'next/cache'

interface ChapterData {
    title: any
    content: string
    lines: { id: string; order: number; content: string; type: number }[]
    order: number
    status: number
    slug: string
    publishedAt: string | null
    isFree: boolean
    price: number
    isTitleSpoiler: boolean
}

export async function createChapter(bookSlug: string, data: ChapterData) {
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/books/chapters`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...data,
                bookSlug // The internal API uses bookSlug or bookId
            })
        })
        const result = await response.json()
        if (!result.isSuccess) return { error: result.message }
        
        revalidatePath(`/author/${bookSlug}`)
        return { chapterId: result.data?.id, slug: result.data?.slug }
    } catch (err) {
        return { error: 'Bölüm oluşturulurken bir hata oluştu.' }
    }
}

export async function updateChapter(bookSlug: string, chapterSlug: string, data: ChapterData) {
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/books/chapters`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...data,
                chapterId: chapterSlug, 
                bookSlug
            })
        })
        const result = await response.json()
        if (!result.isSuccess) return { error: result.message }

        revalidatePath(`/author/${bookSlug}`)
        revalidatePath(`/author/${bookSlug}/chapters/${chapterSlug}/edit`)
        return { success: true }
    } catch (err) {
        return { error: 'Bölüm güncellenirken bir hata oluştu.' }
    }
}

export async function deleteChapter(bookSlug: string, chapterSlug: string) {
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/books/chapters/${chapterSlug}`, {
            method: 'DELETE'
        })
        const result = await response.json()
        if (!result.isSuccess) return { error: result.message }

        revalidatePath(`/author/${bookSlug}`)
        return { success: true }
    } catch (err) {
        return { error: 'Bölüm silinirken bir hata oluştu.' }
    }
}
