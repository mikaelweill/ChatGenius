'use client'

import { createContext, useContext, useState } from 'react'

interface UserStatus {
  [userId: string]: 'online' | 'offline'
}

const UserStatusContext = createContext<{
  statuses: UserStatus
  updateStatuses: (newStatuses: UserStatus) => void
}>({
  statuses: {},
  updateStatuses: () => {}
})

export function UserStatusProvider({ children }: { children: React.ReactNode }) {
  const [statuses, setStatuses] = useState<UserStatus>({})

  const updateStatuses = (newStatuses: UserStatus) => {
    setStatuses(newStatuses)
  }

  return (
    <UserStatusContext.Provider value={{ statuses, updateStatuses }}>
      {children}
    </UserStatusContext.Provider>
  )
}

export const useUserStatus = () => useContext(UserStatusContext) 