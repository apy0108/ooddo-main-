import { useState } from 'react'
import Modal from '../ui/Modal'
import { AlertCircle } from 'lucide-react'

export default function RefuseModal({ isOpen, onClose, onConfirm, title = 'Refuse Request' }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!reason.trim() || reason.trim().length < 5) {
      setError('Please provide a reason for refusal (at least 5 characters).')
      return
    }

    try {
      setSubmitting(true)
      await onConfirm(reason.trim())
      setReason('')
      setError('')
      onClose()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to refuse.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setReason('')
        setError('')
        onClose()
      }}
      title={title}
      subtitle="Please provide a formal reason for refusing this record"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
        <div>
          <label className="block font-semibold text-gray-700 mb-1.5">
            Reason for refusal <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              if (error) setError('')
            }}
            placeholder="e.g. Inadequate shift coverage during sprint release period..."
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:bg-white focus:border-rose-500 transition resize-none"
          />
          {error && (
            <p className="mt-1 text-rose-600 font-medium flex items-center gap-1">
              <AlertCircle size={12} />
              <span>{error}</span>
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => {
              setReason('')
              setError('')
              onClose()
            }}
            className="px-3.5 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition cursor-pointer disabled:opacity-50"
          >
            {submitting ? 'Refusing...' : 'Confirm Refuse'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
