'use client'

import React, { useState } from 'react'
import { Copy, Check, X, Share2, Globe, MessageSquare, Mail } from 'lucide-react'

interface ShareModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    text: string
    url: string
}

export const ShareModal = ({ isOpen, onClose, title, text, url }: ShareModalProps) => {
    const [copied, setCopied] = useState(false)

    if (!isOpen) return null

    const handleCopy = () => {
        navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const shareSocial = (platform: string) => {
        let shareUrl = ''
        switch (platform) {
            case 'facebook': shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`; break
            case 'twitter': shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`; break
            case 'mail': shareUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text + '\n\n' + url)}`; break
        }
        if (shareUrl) window.open(shareUrl, '_blank')
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-base-100 rounded-[32px] w-full max-w-md border border-base-200 shadow-2xl overflow-hidden animate-in scale-in-95 duration-300">
                <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div className="bg-primary/10 p-3 rounded-2xl">
                            <Share2 className="text-primary h-6 w-6" />
                        </div>
                        <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle opacity-50 hover:opacity-100">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <h3 className="text-2xl font-black text-base-content mb-2">{title}</h3>
                    <p className="text-base-content/60 text-sm leading-relaxed mb-8">{text}</p>

                    <div className="space-y-6">
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-bold text-xs uppercase tracking-widest opacity-40">Bölüm Bağlantısı</span>
                            </label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    readOnly 
                                    value={url} 
                                    className="input input-bordered flex-1 rounded-xl bg-base-200 text-sm focus:outline-none" 
                                />
                                <button onClick={handleCopy} className={`btn btn-square rounded-xl ${copied ? 'btn-success' : 'btn-primary'}`}>
                                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <button onClick={() => shareSocial('facebook')} className="btn btn-outline border-base-content/10 rounded-xl flex flex-col gap-1 py-1 h-auto hover:bg-blue-600 hover:border-blue-600">
                                <Globe className="h-5 w-5" />
                                <span className="text-[10px] font-bold">Facebook</span>
                            </button>
                            <button onClick={() => shareSocial('twitter')} className="btn btn-outline border-base-content/10 rounded-xl flex flex-col gap-1 py-1 h-auto hover:bg-blue-400 hover:border-blue-400">
                                <MessageSquare className="h-5 w-5" />
                                <span className="text-[10px] font-bold">Twitter</span>
                            </button>
                            <button onClick={() => shareSocial('mail')} className="btn btn-outline border-base-content/10 rounded-xl flex flex-col gap-1 py-1 h-auto">
                                <Mail className="h-5 w-5" />
                                <span className="text-[10px] font-bold">E-Posta</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-base-200/50 p-4 border-t border-base-200">
                    <button onClick={onClose} className="btn btn-block btn-ghost rounded-2xl font-bold uppercase tracking-widest text-xs">
                        Kapat
                    </button>
                </div>
            </div>
        </div>
    )
}
