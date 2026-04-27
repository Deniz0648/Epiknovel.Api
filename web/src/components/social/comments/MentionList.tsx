import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react'

export interface MentionListProps {
  items: string[]
  command: (props: { id: string }) => void
}

export const MentionList = forwardRef((props: MentionListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const items = props.items || []

  const selectItem = (index: number) => {
    const item = items[index]
    if (item) {
      props.command({ id: item })
    }
  }

  const upHandler = () => {
    setSelectedIndex((selectedIndex + items.length - 1) % items.length || 0)
  }

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % items.length || 0)
  }

  const enterHandler = () => {
    selectItem(selectedIndex)
  }

  useEffect(() => setSelectedIndex(0), [items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        upHandler()
        return true
      }

      if (event.key === 'ArrowDown') {
        downHandler()
        return true
      }

      if (event.key === 'Enter') {
        enterHandler()
        return true
      }

      return false
    },
  }))


  return (
    <div className="flex flex-col gap-1 overflow-hidden rounded-xl border border-base-content/10 bg-base-100 p-1 shadow-xl ring-1 ring-primary/20 backdrop-blur-md">
      {items.length ? (
        items.map((item, index) => (
          <button
            key={index}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold transition-all ${
              index === selectedIndex
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-base-content/70 hover:bg-base-200'
            }`}
            onClick={() => selectItem(index)}
          >
            <span className="shrink-0 text-primary-content opacity-50">@</span>
            {item}
          </button>
        ))
      ) : (
        <div className="px-3 py-2 text-xs font-bold text-base-content/40">
          Sonuç bulunamadı
        </div>
      )}
    </div>
  )
})

MentionList.displayName = 'MentionList'
