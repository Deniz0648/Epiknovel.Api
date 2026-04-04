'use server'

import { revalidatePath } from 'next/cache'
import { performAuthenticatedIdentityRequest } from '@/lib/server-auth'
import { isApiErrorLike } from '@/lib/api'

interface ChapterData {
    title: any
    content: string
    lines: { id: string; order: number; content: string; type: number }[]
    order: number
    status: number
    slug: string
    scheduledPublishDate: string | null
    isFree: boolean
    price: number
    isTitleSpoiler: boolean
}

export async function createChapter(bookSlug: string, bookId: string, data: ChapterData) {
    try {
        const result = await performAuthenticatedIdentityRequest<any>("/books/chapters", {
            method: 'POST',
            body: JSON.stringify({
                ...data,
                bookId // Guid
            })
        })
        
        // 🚀 API Response Logic: Handle Boolean, String, and casing differences
        const rawSuccess = result.data?.isSuccess ?? result.data?.IsSuccess;
        const normalizedSuccess = String(rawSuccess).toLowerCase() === 'true';
        
        const message = result.data?.message || result.data?.Message || result.data?.data?.message || result.data?.Data?.Message || 'Bölüm oluşturulurken bir hata oluştu.';

        // Fail-safe: If message looks like success, it IS success (backend quirk protection)
        const isActuallySuccess = normalizedSuccess || message.includes("başarıyla");

        if (!isActuallySuccess) {
            return { error: message }
        }

        revalidatePath(`/author/${bookSlug}`)
        const resData = result.data?.data || result.data?.Data;
        return { chapterId: resData?.id, slug: resData?.slug }
    } catch (err) {
        if (isApiErrorLike(err)) return { error: err.message }
        return { error: 'Bölüm oluştururken bir sistem hatası oluştu.' }
    }
}

export async function updateChapter(bookSlug: string, chapterId: string, data: ChapterData) {
    try {
        const result = await performAuthenticatedIdentityRequest<any>(`/books/chapters/${chapterId}`, {
            method: 'PATCH',
            body: JSON.stringify({
                ...data,
                ChapterId: chapterId // Guid (Still sending in body for robustness)
            })
        })
        
        // 🚀 API Response Logic: Handle Boolean, String, and casing differences
        const rawSuccess = result.data?.isSuccess ?? result.data?.IsSuccess;
        const normalizedSuccess = String(rawSuccess).toLowerCase() === 'true';
        
        const message = result.data?.message || result.data?.Message || result.data?.data?.message || result.data?.Data?.Message || 'Bölüm güncellenirken bir hata oluştu.';

        // Fail-safe: If message looks like success, it IS success (backend quirk protection)
        const isActuallySuccess = normalizedSuccess || message.includes("başarıyla");

        if (!isActuallySuccess) {
            return { error: message }
        }

        revalidatePath(`/author/${bookSlug}`)
        revalidatePath(`/author/${bookSlug}/chapters/${chapterId}/edit`)
        return { success: true }
    } catch (err) {
        if (isApiErrorLike(err)) return { error: err.message }
        return { error: 'Bölüm güncellenirken bir sistem hatası oluştu.' }
    }
}

export async function deleteChapter(bookSlug: string, chapterId: string) {
    try {
        await performAuthenticatedIdentityRequest<any>(`/books/chapters/${chapterId}`, {
            method: 'DELETE'
        })
        
        revalidatePath(`/author/${bookSlug}`)
        return { success: true }
    } catch (err) {
        if (isApiErrorLike(err)) return { error: err.message }
        return { error: 'Bölüm silinirken bir hata oluştu.' }
    }
}
