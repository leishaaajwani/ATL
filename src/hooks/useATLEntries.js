import { useEffect, useState } from 'react'
import {
  subscribeToStudentEntries,
  subscribeToPendingEntries,
  subscribeToAllEntries,
} from '../firebase/firestore'

export function useStudentEntries(studentId) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!studentId) { setLoading(false); return }
    const unsub = subscribeToStudentEntries(studentId, data => {
      setEntries(data)
      setLoading(false)
    })
    return unsub
  }, [studentId])

  return { entries, loading }
}

export function usePendingEntries() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeToPendingEntries(data => {
      setEntries(data)
      setLoading(false)
    })
    return unsub
  }, [])

  return { entries, loading }
}

export function useAllEntries() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeToAllEntries(data => {
      setEntries(data)
      setLoading(false)
    })
    return unsub
  }, [])

  return { entries, loading }
}
