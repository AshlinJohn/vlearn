
"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  MessageCircle, 
  Search, 
  Send, 
  Users, 
  Plus, 
  BookOpen, 
  UserPlus, 
  X, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Phone, 
  PhoneOff, 
  Play, 
  Pause, 
  Download,
  UserCheck,
  Settings
} from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useAuth } from "./auth-provider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface Message {
  id: string
  content: string
  senderId: string
  receiverId?: string
  groupId?: string
  timestamp: string
  senderName: string
  type?: 'text' | 'course_invite' | 'study_group' | 'voice' | 'video_call'
  courseData?: any
  voiceData?: {
    duration: number
    audioUrl: string
    voiceId?: string
  }
  videoCallData?: {
    duration: number
    status: 'missed' | 'completed' | 'declined'
  }
}

interface Friend {
  id: string
  name: string
  email: string
  online: boolean
  lastSeen?: string
}

interface GroupChat {
  id: string
  name: string
  members: string[]
  creator: string
  createdAt: string
  lastMessage?: string
  unreadCount?: number
}

interface CourseInvitation {
  id: string
  courseId: string
  courseName: string
  fromUserId: string
  fromUserName: string
  toUserId: string
  status: 'pending' | 'accepted' | 'declined'
  timestamp: string
}

interface StudyGroup {
  id: string
  name: string
  courseId: string
  courseName: string
  members: string[]
  creator: string
  createdAt: string
}

interface VoiceRecorder {
  isRecording: boolean
  startTime: number
  mediaRecorder?: MediaRecorder
  audioChunks: Blob[]
}

interface VideoCall {
  isActive: boolean
  isVideoEnabled: boolean
  isAudioEnabled: boolean
  startTime: number
  localStream?: MediaStream
  remoteStream?: MediaStream
}

export function MessengerModule() {
  const [friends, setFriends] = useState<Friend[]>([])
  const [selectedChat, setSelectedChat] = useState<Friend | GroupChat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [courseInvitations, setCourseInvitations] = useState<CourseInvitation[]>([])
  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([])
  const [groupChats, setGroupChats] = useState<GroupChat[]>([])
  const [selectedCourseForInvite, setSelectedCourseForInvite] = useState<any>(null)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [groupName, setGroupName] = useState("")
  const [voiceRecorder, setVoiceRecorder] = useState<VoiceRecorder>({
    isRecording: false,
    startTime: 0,
    audioChunks: []
  })
  const [videoCall, setVideoCall] = useState<VideoCall>({
    isActive: false,
    isVideoEnabled: false,
    isAudioEnabled: false,
    startTime: 0
  })
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [callDuration, setCallDuration] = useState(0)
  
  const { user, updateUser } = useAuth()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (user) {
      loadAllUsers()
      loadFriends()
      loadCourseInvitations()
      loadStudyGroups()
      loadGroupChats()
    }
  }, [user])

  useEffect(() => {
    if (selectedChat) {
      loadMessages()
    }
  }, [selectedChat])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Recording timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (voiceRecorder.isRecording) {
      interval = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - voiceRecorder.startTime) / 1000))
      }, 1000)
    } else {
      setRecordingTime(0)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [voiceRecorder.isRecording, voiceRecorder.startTime])

  // Video call timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (videoCall.isActive) {
      interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - videoCall.startTime) / 1000))
      }, 1000)
    } else {
      setCallDuration(0)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [videoCall.isActive, videoCall.startTime])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const loadAllUsers = () => {
    const users = JSON.parse(localStorage.getItem("all-users") || "[]")
    setAllUsers(users.filter((u: any) => u.id !== user?.id))
  }

  const loadFriends = () => {
    if (!user?.profile?.friends) return

    const allUsers = JSON.parse(localStorage.getItem("all-users") || "[]")
    const userFriends = user.profile.friends.map((friendId: string) => {
      const friend = allUsers.find((u: any) => u.id === friendId)
      return friend ? {
        id: friend.id,
        name: friend.name,
        email: friend.email,
        online: Math.random() > 0.5,
        lastSeen: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
      } : null
    }).filter(Boolean)

    setFriends(userFriends)
  }

  const loadGroupChats = () => {
    const groups = JSON.parse(localStorage.getItem("group-chats") || "[]")
    const userGroups = groups.filter((group: GroupChat) => 
      group.members.includes(user?.id || "")
    )
    setGroupChats(userGroups)
  }

  const loadCourseInvitations = () => {
    const invitations = JSON.parse(localStorage.getItem("course-invitations") || "[]")
    setCourseInvitations(invitations.filter((inv: CourseInvitation) => 
      inv.toUserId === user?.id || inv.fromUserId === user?.id
    ))
  }

  const loadStudyGroups = () => {
    const groups = JSON.parse(localStorage.getItem("study-groups") || "[]")
    setStudyGroups(groups.filter((group: StudyGroup) => 
      group.members.includes(user?.id || "")
    ))
  }

  const createGroupChat = () => {
    if (!user || !groupName.trim() || selectedMembers.length === 0) return

    const newGroup: GroupChat = {
      id: `group-${Date.now()}`,
      name: groupName,
      members: [user.id, ...selectedMembers],
      creator: user.id,
      createdAt: new Date().toISOString(),
      unreadCount: 0
    }

    const groups = JSON.parse(localStorage.getItem("group-chats") || "[]")
    groups.push(newGroup)
    localStorage.setItem("group-chats", JSON.stringify(groups))

    setGroupChats(prev => [...prev, newGroup])
    setShowCreateGroup(false)
    setGroupName("")
    setSelectedMembers([])
    setSelectedChat(newGroup)
  }

  const addFriend = async (friendId: string) => {
    if (!user) return

    if (user.profile?.friends?.includes(friendId)) {
      return
    }

    const updatedUser = {
      ...user,
      profile: {
        ...user.profile,
        friends: [...(user.profile?.friends || []), friendId]
      }
    }

    localStorage.setItem("local-user", JSON.stringify(updatedUser))

    const allUsers = JSON.parse(localStorage.getItem("all-users") || "[]")
    const userIndex = allUsers.findIndex((u: any) => u.id === user.id)
    if (userIndex !== -1) {
      allUsers[userIndex] = updatedUser
      localStorage.setItem("all-users", JSON.stringify(allUsers))
    }

    const friendIndex = allUsers.findIndex((u: any) => u.id === friendId)
    if (friendIndex !== -1) {
      const friend = allUsers[friendIndex]
      if (!friend.profile?.friends?.includes(user.id)) {
        allUsers[friendIndex] = {
          ...friend,
          profile: {
            ...friend.profile,
            friends: [...(friend.profile?.friends || []), user.id]
          }
        }
        localStorage.setItem("all-users", JSON.stringify(allUsers))
      }
    }

    updateUser(updatedUser)
    loadFriends()
    loadAllUsers()
  }

  const startVoiceRecording = async () => {
    try {
      // Check if microphone is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Voice recording is not supported in this browser.')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      
      // Determine the best supported audio format
      let mimeType = 'audio/webm'
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4'
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          mimeType = 'audio/wav'
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      const audioChunks: Blob[] = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: mimeType })
        const audioUrl = URL.createObjectURL(audioBlob)
        const duration = recordingTime || Math.floor((Date.now() - voiceRecorder.startTime) / 1000)
        
        if (duration < 1) {
          alert('Recording too short. Please record for at least 1 second.')
          stream.getTracks().forEach(track => track.stop())
          return
        }
        
        // Save to localStorage for persistence
        const voiceMessageData = {
          id: `voice-${Date.now()}`,
          blob: audioBlob,
          url: audioUrl,
          duration: duration
        }
        
        const savedVoiceMessages = JSON.parse(localStorage.getItem("voice-messages") || "{}")
        savedVoiceMessages[voiceMessageData.id] = {
          url: audioUrl,
          duration: duration,
          timestamp: new Date().toISOString(),
          mimeType: mimeType
        }
        localStorage.setItem("voice-messages", JSON.stringify(savedVoiceMessages))
        
        sendVoiceMessage(audioUrl, duration, voiceMessageData.id)
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        alert('Error during recording. Please try again.')
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start(100) // Record in smaller chunks for better responsiveness
      setVoiceRecorder({
        isRecording: true,
        startTime: Date.now(),
        mediaRecorder,
        audioChunks: []
      })
    } catch (error) {
      console.error('Error accessing microphone:', error)
      if (error instanceof Error && error.name === 'NotAllowedError') {
        alert('Microphone access denied. Please allow microphone permissions and try again.')
      } else if (error instanceof Error && error.name === 'NotFoundError') {
        alert('No microphone found. Please check your audio devices.')
      } else {
        alert('Unable to access microphone. Please check your permissions and try again.')
      }
    }
  }

  const stopVoiceRecording = () => {
    if (voiceRecorder.mediaRecorder && voiceRecorder.isRecording) {
      voiceRecorder.mediaRecorder.stop()
      setVoiceRecorder({
        isRecording: false,
        startTime: 0,
        audioChunks: []
      })
    }
  }

  const sendVoiceMessage = (audioUrl: string, duration: number, voiceId: string) => {
    if (!user || !selectedChat) return

    const message: Message = {
      id: `msg-${Date.now()}`,
      content: `🎤 Voice message (${formatDuration(duration)})`,
      senderId: user.id,
      receiverId: 'groupId' in selectedChat ? undefined : selectedChat.id,
      groupId: 'groupId' in selectedChat ? selectedChat.id : undefined,
      timestamp: new Date().toISOString(),
      senderName: user.name,
      type: 'voice',
      voiceData: {
        duration,
        audioUrl,
        voiceId
      }
    }

    const allMessages = JSON.parse(localStorage.getItem("messages") || "[]")
    allMessages.push(message)
    localStorage.setItem("messages", JSON.stringify(allMessages))

    setMessages(prev => [...prev, message])
  }

  const playVoiceMessage = (messageId: string, audioUrl: string) => {
    if (playingVoiceId === messageId) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
      setPlayingVoiceId(null)
    } else {
      if (audioRef.current) {
        // Stop any currently playing audio
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        
        audioRef.current.src = audioUrl
        audioRef.current.load() // Ensure the audio is loaded
        
        const playPromise = audioRef.current.play()
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setPlayingVoiceId(messageId)
            })
            .catch(error => {
              console.error('Error playing audio:', error)
              alert('Error playing voice message. Please try again.')
              setPlayingVoiceId(null)
            })
        }
        
        audioRef.current.onended = () => {
          setPlayingVoiceId(null)
        }
        
        audioRef.current.onerror = (error) => {
          console.error('Error loading audio:', error)
          alert('Error loading voice message.')
          setPlayingVoiceId(null)
        }
        
        audioRef.current.onloadstart = () => {
          console.log('Loading audio...')
        }
        
        audioRef.current.oncanplay = () => {
          console.log('Audio can play')
        }
      }
    }
  }

  const startVideoCall = async () => {
    try {
      // Check if media devices are available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Video calling is not supported in this browser.')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: 'user'
        }, 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      
      setVideoCall({
        isActive: true,
        isVideoEnabled: true,
        isAudioEnabled: true,
        startTime: Date.now(),
        localStream: stream
      })

      // Wait for state to update before setting video
      setTimeout(() => {
        if (localVideoRef.current && stream) {
          localVideoRef.current.srcObject = stream
          localVideoRef.current.muted = true // Prevent audio feedback
          localVideoRef.current.play().catch(err => {
            console.error('Error playing local video:', err)
          })
        }
      }, 100)

      // Send video call notification
      if (user && selectedChat && !('groupId' in selectedChat)) {
        const message: Message = {
          id: `msg-${Date.now()}`,
          content: `📹 ${user.name} started a video call`,
          senderId: user.id,
          receiverId: selectedChat.id,
          timestamp: new Date().toISOString(),
          senderName: user.name,
          type: 'video_call',
          videoCallData: {
            duration: 0,
            status: 'missed'
          }
        }

        const allMessages = JSON.parse(localStorage.getItem("messages") || "[]")
        allMessages.push(message)
        localStorage.setItem("messages", JSON.stringify(allMessages))
        setMessages(prev => [...prev, message])
      }
    } catch (error) {
      console.error('Error accessing camera/microphone:', error)
      if (error instanceof Error && error.name === 'NotAllowedError') {
        alert('Camera/microphone access denied. Please allow permissions and try again.')
      } else if (error instanceof Error && error.name === 'NotFoundError') {
        alert('No camera/microphone found. Please check your devices.')
      } else {
        alert('Unable to access camera/microphone. Please check your permissions and try again.')
      }
    }
  }

  const endVideoCall = () => {
    if (videoCall.localStream) {
      videoCall.localStream.getTracks().forEach(track => {
        track.stop()
      })
    }
    
    const duration = Math.floor((Date.now() - videoCall.startTime) / 1000)
    
    // Send call ended message
    if (user && selectedChat && !('groupId' in selectedChat) && duration > 0) {
      const message: Message = {
        id: `msg-${Date.now()}`,
        content: `📹 Call ended • Duration: ${formatDuration(duration)}`,
        senderId: user.id,
        receiverId: selectedChat.id,
        timestamp: new Date().toISOString(),
        senderName: user.name,
        type: 'video_call',
        videoCallData: {
          duration: duration,
          status: 'completed'
        }
      }

      const allMessages = JSON.parse(localStorage.getItem("messages") || "[]")
      allMessages.push(message)
      localStorage.setItem("messages", JSON.stringify(allMessages))
      setMessages(prev => [...prev, message])
    }
    
    setVideoCall({
      isActive: false,
      isVideoEnabled: false,
      isAudioEnabled: false,
      startTime: 0
    })

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }
  }

  const toggleVideo = () => {
    if (videoCall.localStream) {
      const videoTrack = videoCall.localStream.getVideoTracks()[0]
      if (videoTrack) {
        const newVideoState = !videoCall.isVideoEnabled
        videoTrack.enabled = newVideoState
        setVideoCall(prev => ({ ...prev, isVideoEnabled: newVideoState }))
        
        console.log(`Video ${newVideoState ? 'enabled' : 'disabled'}`)
      }
    }
  }

  const toggleAudio = () => {
    if (videoCall.localStream) {
      const audioTrack = videoCall.localStream.getAudioTracks()[0]
      if (audioTrack) {
        const newAudioState = !videoCall.isAudioEnabled
        audioTrack.enabled = newAudioState
        setVideoCall(prev => ({ ...prev, isAudioEnabled: newAudioState }))
        
        console.log(`Audio ${newAudioState ? 'enabled' : 'disabled'}`)
      }
    }
  }

  const sendCourseInvitation = (courseId: string, courseName: string, toUserId: string) => {
    if (!user) return

    const invitation: CourseInvitation = {
      id: `inv-${Date.now()}`,
      courseId,
      courseName,
      fromUserId: user.id,
      fromUserName: user.name,
      toUserId,
      status: 'pending',
      timestamp: new Date().toISOString()
    }

    const invitations = JSON.parse(localStorage.getItem("course-invitations") || "[]")
    invitations.push(invitation)
    localStorage.setItem("course-invitations", JSON.stringify(invitations))

    const message: Message = {
      id: `msg-${Date.now()}`,
      content: `📚 ${user.name} invited you to study "${courseName}" together!`,
      senderId: user.id,
      receiverId: toUserId,
      timestamp: new Date().toISOString(),
      senderName: user.name,
      type: 'course_invite',
      courseData: { courseId, courseName, invitationId: invitation.id }
    }

    const allMessages = JSON.parse(localStorage.getItem("messages") || "[]")
    allMessages.push(message)
    localStorage.setItem("messages", JSON.stringify(allMessages))

    loadCourseInvitations()
    if (selectedChat && 'id' in selectedChat && selectedChat.id === toUserId) {
      loadMessages()
    }
  }

  const acceptCourseInvitation = (invitationId: string) => {
    const invitations = JSON.parse(localStorage.getItem("course-invitations") || "[]")
    const updatedInvitations = invitations.map((inv: CourseInvitation) => 
      inv.id === invitationId ? { ...inv, status: 'accepted' } : inv
    )
    localStorage.setItem("course-invitations", JSON.stringify(updatedInvitations))
    loadCourseInvitations()
  }

  const createStudyGroup = (courseId: string, courseName: string, memberIds: string[]) => {
    if (!user) return

    const studyGroup: StudyGroup = {
      id: `group-${Date.now()}`,
      name: `${courseName} Study Group`,
      courseId,
      courseName,
      members: [user.id, ...memberIds],
      creator: user.id,
      createdAt: new Date().toISOString()
    }

    const groups = JSON.parse(localStorage.getItem("study-groups") || "[]")
    groups.push(studyGroup)
    localStorage.setItem("study-groups", JSON.stringify(groups))

    loadStudyGroups()
  }

  const loadMessages = () => {
    if (!user || !selectedChat) return

    const allMessages = JSON.parse(localStorage.getItem("messages") || "[]")
    let conversationMessages: Message[]

    if ('groupId' in selectedChat) {
      // Group chat messages
      conversationMessages = allMessages.filter((msg: Message) => 
        msg.groupId === selectedChat.id
      )
    } else {
      // Direct messages
      conversationMessages = allMessages.filter((msg: Message) => 
        (msg.senderId === user.id && msg.receiverId === selectedChat.id) ||
        (msg.senderId === selectedChat.id && msg.receiverId === user.id)
      )
    }

    setMessages(conversationMessages.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    ))
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !selectedChat) return

    const message: Message = {
      id: `msg-${Date.now()}`,
      content: newMessage,
      senderId: user.id,
      receiverId: 'groupId' in selectedChat ? undefined : selectedChat.id,
      groupId: 'groupId' in selectedChat ? selectedChat.id : undefined,
      timestamp: new Date().toISOString(),
      senderName: user.name
    }

    const allMessages = JSON.parse(localStorage.getItem("messages") || "[]")
    allMessages.push(message)
    localStorage.setItem("messages", JSON.stringify(allMessages))

    setMessages(prev => [...prev, message])
    setNewMessage("")

    // Update group chat last message
    if ('groupId' in selectedChat) {
      const groups = JSON.parse(localStorage.getItem("group-chats") || "[]")
      const updatedGroups = groups.map((group: GroupChat) => 
        group.id === selectedChat.id 
          ? { ...group, lastMessage: newMessage.slice(0, 50) }
          : group
      )
      localStorage.setItem("group-chats", JSON.stringify(updatedGroups))
      setGroupChats(updatedGroups.filter((group: GroupChat) => 
        group.members.includes(user?.id || "")
      ))
    }
  }

  const getUserCourses = () => {
    const localCourses = JSON.parse(localStorage.getItem("local-courses") || "[]")
    const savedCourses = JSON.parse(localStorage.getItem("courses") || "[]")
    return [...localCourses, ...savedCourses].filter((c: any) => c.user_id === user?.id)
  }

  const getGroupMemberNames = (memberIds: string[]) => {
    const allUsers = JSON.parse(localStorage.getItem("all-users") || "[]")
    return memberIds
      .filter(id => id !== user?.id)
      .map(id => {
        const member = allUsers.find((u: any) => u.id === id)
        return member?.name || 'Unknown'
      })
      .join(', ')
  }

  const filteredUsers = allUsers.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         u.email.toLowerCase().includes(searchQuery.toLowerCase())
    const isNotFriend = !user?.profile?.friends?.includes(u.id)
    return matchesSearch && isNotFriend
  })

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredGroups = groupChats.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const downloadVoiceMessage = (audioUrl: string, messageId: string) => {
    const link = document.createElement('a')
    link.href = audioUrl
    link.download = `voice-message-${messageId}.wav`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Messages & Study Groups</h1>
        <p className="text-muted-foreground">Connect with friends, create group chats, and collaborate with voice & video</p>
      </div>

      {/* Hidden audio element for voice messages */}
      <audio ref={audioRef} />

      {/* Course Invitations */}
      {courseInvitations.filter(inv => inv.toUserId === user?.id && inv.status === 'pending').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Course Invitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {courseInvitations
                .filter(inv => inv.toUserId === user?.id && inv.status === 'pending')
                .map((invitation) => (
                  <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{invitation.fromUserName}</p>
                      <p className="text-sm text-muted-foreground">
                        Invited you to study "{invitation.courseName}"
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => acceptCourseInvitation(invitation.id)}>
                        Accept
                      </Button>
                      <Button size="sm" variant="outline">
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Video Call Modal - Full Screen */}
      {videoCall.isActive && (
        <div className="fixed inset-0 bg-black z-[9999] flex flex-col" style={{ width: '100vw', height: '100vh' }}>
          {/* Main video area */}
          <div className="flex-1 relative bg-gray-900 overflow-hidden">
            {/* Remote video background (full screen) */}
            <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="w-32 h-32 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-16 w-16 text-gray-400" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">Calling {selectedChat?.name}...</h2>
                <p className="text-gray-400">Waiting for them to join</p>
              </div>
            </div>
            
            {/* Local video (picture-in-picture) - Larger size */}
            <div className="absolute top-6 right-6 w-80 h-60 bg-gray-900 rounded-xl overflow-hidden border-4 border-white/10 shadow-2xl">
              {videoCall.isVideoEnabled && videoCall.localStream ? (
                <video
                  ref={localVideoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
              ) : (
                <div className="w-full h-full bg-gray-700 flex flex-col items-center justify-center">
                  <VideoOff className="h-12 w-12 text-gray-400 mb-2" />
                  <span className="text-gray-400 text-sm">Camera Off</span>
                </div>
              )}
              <div className="absolute bottom-3 left-3 bg-black/70 text-white text-sm px-3 py-1 rounded-full backdrop-blur-sm">
                You
              </div>
            </div>

            {/* Call status indicator */}
            <div className="absolute top-6 left-6 bg-black/70 text-white px-6 py-3 rounded-xl backdrop-blur-sm border border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-semibold">Connected</span>
                </div>
                <div className="h-4 w-px bg-white/30"></div>
                <span className="font-mono text-lg">{formatDuration(callDuration)}</span>
              </div>
            </div>

            {/* Connection quality indicator */}
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-lg backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span>Audio: {videoCall.isAudioEnabled ? 'On' : 'Off'}</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  <span>Video: {videoCall.isVideoEnabled ? 'On' : 'Off'}</span>
                </div>
                <span>•</span>
                <span>HD Quality</span>
              </div>
            </div>
          </div>

          {/* Call controls - Fixed at bottom */}
          <div className="bg-black/95 p-8 backdrop-blur-md border-t border-white/10">
            <div className="flex justify-center items-center gap-8">
              {/* Microphone toggle */}
              <Button
                size="lg"
                variant={videoCall.isAudioEnabled ? "secondary" : "destructive"}
                onClick={toggleAudio}
                className={`rounded-full w-20 h-20 transition-all hover:scale-110 shadow-2xl ${
                  videoCall.isAudioEnabled 
                    ? 'bg-gray-600 hover:bg-gray-500 text-white border-2 border-white/20' 
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
                title={videoCall.isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
              >
                {videoCall.isAudioEnabled ? (
                  <Mic className="h-8 w-8" />
                ) : (
                  <MicOff className="h-8 w-8" />
                )}
              </Button>
              
              {/* Video toggle */}
              <Button
                size="lg"
                variant={videoCall.isVideoEnabled ? "secondary" : "destructive"}
                onClick={toggleVideo}
                className={`rounded-full w-20 h-20 transition-all hover:scale-110 shadow-2xl ${
                  videoCall.isVideoEnabled 
                    ? 'bg-gray-600 hover:bg-gray-500 text-white border-2 border-white/20' 
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
                title={videoCall.isVideoEnabled ? "Turn off camera" : "Turn on camera"}
              >
                {videoCall.isVideoEnabled ? (
                  <Video className="h-8 w-8" />
                ) : (
                  <VideoOff className="h-8 w-8" />
                )}
              </Button>
              
              {/* End call */}
              <Button
                size="lg"
                variant="destructive"
                onClick={endVideoCall}
                className="rounded-full w-20 h-20 transition-all hover:scale-110 bg-red-600 hover:bg-red-700 shadow-2xl border-2 border-red-400"
                title="End call"
              >
                <PhoneOff className="h-8 w-8" />
              </Button>

              {/* Settings button */}
              <Button
                size="lg"
                variant="outline"
                className="rounded-full w-20 h-20 transition-all hover:scale-110 bg-gray-700 hover:bg-gray-600 border-2 border-gray-500 text-white shadow-2xl"
                title="Call settings"
              >
                <Settings className="h-8 w-8" />
              </Button>
            </div>
            
            {/* Call info bar */}
            <div className="mt-6 text-center text-white/70 text-lg">
              <div className="flex items-center justify-center gap-4">
                <span>Call with {selectedChat?.name}</span>
                <span>•</span>
                <span>Duration: {formatDuration(callDuration)}</span>
                <span>•</span>
                <span>1080p HD</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Friends & Groups List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Chats ({friends.length + groupChats.length})
              </CardTitle>
              <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Group Chat</DialogTitle>
                    <DialogDescription>
                      Create a new group chat with your friends
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="groupName">Group Name</Label>
                      <Input
                        id="groupName"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="Enter group name..."
                      />
                    </div>
                    <div>
                      <Label>Select Members</Label>
                      <ScrollArea className="h-40 border rounded-md p-2">
                        {friends.map((friend) => (
                          <div key={friend.id} className="flex items-center space-x-2 py-2">
                            <Checkbox
                              id={friend.id}
                              checked={selectedMembers.includes(friend.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedMembers([...selectedMembers, friend.id])
                                } else {
                                  setSelectedMembers(selectedMembers.filter(id => id !== friend.id))
                                }
                              }}
                            />
                            <Label htmlFor={friend.id} className="flex-1">
                              {friend.name}
                            </Label>
                          </div>
                        ))}
                      </ScrollArea>
                    </div>
                    <Button 
                      onClick={createGroupChat} 
                      disabled={!groupName.trim() || selectedMembers.length === 0}
                      className="w-full"
                    >
                      Create Group
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {/* Group Chats */}
                {filteredGroups.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2 text-sm text-muted-foreground">Group Chats</h4>
                    {filteredGroups.map((group) => (
                      <div
                        key={group.id}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedChat && 'id' in selectedChat && selectedChat.id === group.id
                            ? 'bg-primary/10 border border-primary/20' 
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => setSelectedChat(group)}
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{group.name}</div>
                          <p className="text-sm text-muted-foreground">
                            {group.members.length} members
                            {group.lastMessage && ` • ${group.lastMessage}`}
                          </p>
                        </div>
                        {group.unreadCount && group.unreadCount > 0 && (
                          <Badge variant="destructive" className="rounded-full">
                            {group.unreadCount}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Direct Messages */}
                <h4 className="font-medium mb-2 text-sm text-muted-foreground">Direct Messages</h4>
                {filteredFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedChat && 'id' in selectedChat && selectedChat.id === friend.id 
                        ? 'bg-primary/10 border border-primary/20' 
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedChat(friend)}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={`/placeholder-user.jpg`} />
                      <AvatarFallback>
                        {friend.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{friend.name}</span>
                        {friend.online && (
                          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {friend.online ? (
                          <span className="flex items-center gap-1">
                            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                            Online
                          </span>
                        ) : (
                          `Last seen ${formatTime(friend.lastSeen || '')}`
                        )}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Add new friends section */}
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">Add Friends ({filteredUsers.length} available)</h4>
                  {filteredUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No new users to add</p>
                  ) : (
                    filteredUsers.slice(0, 5).map((potentialFriend) => (
                      <div key={potentialFriend.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {potentialFriend.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{potentialFriend.name}</p>
                          <p className="text-xs text-muted-foreground">{potentialFriend.email}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addFriend(potentialFriend.id)}
                        >
                          <UserPlus className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                  {searchQuery && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full mt-2"
                      onClick={() => setSearchQuery("")}
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-2">
          {selectedChat ? (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {'groupId' in selectedChat ? (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5" />
                      </div>
                    ) : (
                      <Avatar>
                        <AvatarImage src={`/placeholder-user.jpg`} />
                        <AvatarFallback>
                          {selectedChat.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div>
                      <CardTitle>{selectedChat.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {'groupId' in selectedChat ? (
                          `${selectedChat.members.length} members: ${getGroupMemberNames(selectedChat.members)}`
                        ) : selectedChat.online ? (
                          <span className="flex items-center gap-1">
                            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                            Online
                          </span>
                        ) : (
                          `Last seen ${formatTime(selectedChat.lastSeen || '')}`
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {/* Video call only for direct messages */}
                    {!('groupId' in selectedChat) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={startVideoCall}
                        disabled={videoCall.isActive}
                      >
                        <Video className="h-4 w-4 mr-1" />
                        Video Call
                      </Button>
                    )}
                    
                    {/* Course invite only for direct messages */}
                    {!('groupId' in selectedChat) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const courses = getUserCourses()
                          if (courses.length > 0) {
                            setSelectedCourseForInvite(courses[0])
                          }
                        }}
                      >
                        <BookOpen className="h-4 w-4 mr-1" />
                        Invite to Course
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col">
                <ScrollArea className="h-[350px] mb-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            message.senderId === user?.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {/* Show sender name in group chats */}
                          {'groupId' in selectedChat && message.senderId !== user?.id && (
                            <p className="text-xs font-medium mb-1 opacity-70">
                              {message.senderName}
                            </p>
                          )}

                          {message.type === 'course_invite' && (
                            <div className="border-b pb-2 mb-2">
                              <Badge variant="secondary">Course Invitation</Badge>
                            </div>
                          )}

                          {message.type === 'voice' && message.voiceData && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant={message.senderId === user?.id ? "secondary" : "outline"}
                                onClick={() => playVoiceMessage(message.id, message.voiceData!.audioUrl)}
                              >
                                {playingVoiceId === message.id ? (
                                  <Pause className="h-3 w-3" />
                                ) : (
                                  <Play className="h-3 w-3" />
                                )}
                              </Button>
                              <span className="text-sm">
                                {formatDuration(message.voiceData.duration)}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => downloadVoiceMessage(message.voiceData!.audioUrl, message.id)}
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          )}

                          {message.type === 'video_call' && message.videoCallData && (
                            <div className="flex items-center gap-2">
                              <Video className="h-4 w-4" />
                              <span className="text-sm">
                                {message.videoCallData.status === 'completed' 
                                  ? `Call ended • ${formatDuration(message.videoCallData.duration)}`
                                  : 'Video call'}
                              </span>
                            </div>
                          )}

                          {(!message.type || message.type === 'text') && (
                            <p>{message.content}</p>
                          )}

                          {message.courseData && message.senderId !== user?.id && (
                            <div className="mt-2 pt-2 border-t">
                              <Button 
                                size="sm" 
                                onClick={() => acceptCourseInvitation(message.courseData.invitationId)}
                              >
                                Accept Invitation
                              </Button>
                            </div>
                          )}
                          
                          <p className={`text-xs mt-1 ${
                            message.senderId === user?.id 
                              ? 'text-primary-foreground/70' 
                              : 'text-muted-foreground'
                          }`}>
                            {formatTime(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="flex gap-2">
                  {/* Voice recording button */}
                  <Button
                    size="icon"
                    variant={voiceRecorder.isRecording ? "destructive" : "outline"}
                    onClick={voiceRecorder.isRecording ? stopVoiceRecording : startVoiceRecording}
                    title={voiceRecorder.isRecording ? "Stop recording" : "Record voice message"}
                    className="transition-all hover:scale-105"
                  >
                    {voiceRecorder.isRecording ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>

                  <Input
                    placeholder={voiceRecorder.isRecording ? "Recording voice message..." : "Type a message..."}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    className="flex-1"
                    disabled={voiceRecorder.isRecording}
                  />
                  <Button 
                    onClick={sendMessage} 
                    disabled={!newMessage.trim() || voiceRecorder.isRecording}
                    className="transition-all hover:scale-105"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>

                {voiceRecorder.isRecording && (
                  <div className="mt-2 p-3 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-red-600">
                        <div className="relative">
                          <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
                          <div className="absolute inset-0 h-3 w-3 bg-red-500 rounded-full animate-ping"></div>
                        </div>
                        <span className="font-medium">Recording...</span>
                        <span className="font-mono">
                          {formatDuration(recordingTime)}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={stopVoiceRecording}
                        className="text-red-600 hover:text-red-700 hover:bg-red-100"
                      >
                        Stop & Send
                      </Button>
                    </div>
                    <div className="mt-2 text-xs text-red-500">
                      Click "Stop & Send" or the microphone button to send your voice message
                    </div>
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Select a chat to start messaging</h3>
                <p className="text-muted-foreground">
                  Choose a friend or group from the list to begin your conversation
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Quick Course Invite Modal */}
      {selectedCourseForInvite && selectedChat && !('groupId' in selectedChat) && (
        <Card className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Invite to Course</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedCourseForInvite(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <p>Select a course to invite {selectedChat.name} to study together:</p>
              <div className="space-y-2">
                {getUserCourses().map((course) => (
                  <Button
                    key={course.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      sendCourseInvitation(course.id, course.title, selectedChat.id)
                      setSelectedCourseForInvite(null)
                    }}
                  >
                    <span className="mr-2">{course.icon}</span>
                    {course.title}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
