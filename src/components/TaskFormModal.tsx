import { useEffect, useState } from 'react'
import type { Priority, Task } from '../types'

interface Props {
  onClose: () => void
  // 생성: initial 없음 / 수정: initial 채워서 열림. 둘 다 onSubmit으로 값 전달
  onSubmit: (input: { title: string; priority: Priority; description?: string }) => void
  initial?: Task // 있으면 "수정 모드", 없으면 "생성 모드"
}

export function TaskFormModal({ onClose, onSubmit, initial }: Props) {
  const isEdit = !!initial
  const [title, setTitle] = useState(initial?.title ?? '')
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'medium')
  const [description, setDescription] = useState(initial?.description ?? '')

  // 모달 열려 있는 동안 body 스크롤 잠금
  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original // 닫힐 때 원복
    }
  }, [])

  // ESC로 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = () => {
    const trimmed = title.trim()
    if (!trimmed) {
      alert('제목을 입력해주세요.')
      return
    }
    onSubmit({
      title: trimmed,
      priority,
      description: description.trim() || undefined, // 빈 값이면 제외(선택)
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEdit ? '할 일 수정' : '새 할 일 추가'}</h3>
          <button type="button" className="modal-close" aria-label="닫기" onClick={onClose}>
            ×
          </button>
        </div>

        <label className="modal-field">
          <span>제목 (필수)</span>
          <input
            type="text"
            autoFocus
            placeholder="할 일 제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
          />
        </label>

        <label className="modal-field">
          <span>우선순위 (필수)</span>
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>

        <label className="modal-field">
          <span>설명 (선택)</span>
          <textarea
            placeholder="설명을 입력하세요"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </label>

        <div className="modal-actions">
          <button type="button" className="btn-cancel" onClick={onClose}>
            취소
          </button>
          <button type="button" className="btn-submit" onClick={submit}>
            {isEdit ? '저장' : '추가'}
          </button>
        </div>
      </div>
    </div>
  )
}