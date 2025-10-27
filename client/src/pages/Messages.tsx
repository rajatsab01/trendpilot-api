import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useVersionGuard } from "@/hooks/useVersionGuard";
import BottomNav from "@/components/BottomNav";
import type { Message, User } from "@shared/schema";
import { APP_VERSION } from "@shared/schema";

type Conversation = {
  otherUser: User;
  lastMessage: Message;
  unreadCount: number;
};

type MessageWithUser = Message & {
  sender: User;
  receiver: User;
};

export default function Messages({ params }: { params?: { chatUserId?: string } }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { guardAction, UpdateModal } = useVersionGuard();
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userId = localStorage.getItem("userId");
  const chatUserId = params?.chatUserId; // If present, we're in a specific chat

  // Fetch recent conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/messages/recent", userId],
    enabled: !!userId && !chatUserId, // Only load when viewing conversation list
  });

  // Fetch chat messages if in a specific chat
  const { data: messages = [], isLoading: messagesLoading } = useQuery<MessageWithUser[]>({
    queryKey: ["/api/messages/conversation", userId, chatUserId],
    enabled: !!userId && !!chatUserId,
    refetchInterval: 3000, // Poll every 3 seconds for new messages
  });

  // Fetch other user's profile in chat
  const { data: otherUserProfile } = useQuery({
    queryKey: ["/api/community/user", chatUserId, userId],
    queryFn: async () => {
      const response = await fetch(`/api/community/user/${chatUserId}?currentUserId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
    enabled: !!chatUserId && !!userId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", "/api/messages", {
        senderId: userId,
        receiverId: chatUserId,
        content: content.trim(),
        appVersion: APP_VERSION,
      });
    },
    onSuccess: () => {
      setMessageText("");
      setIsSending(false);
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversation", userId, chatUserId] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/recent", userId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      setIsSending(false);
    },
  });

  // Mark messages as read when entering chat
  useEffect(() => {
    if (chatUserId && messages.length > 0) {
      const unreadMessages = messages.filter(
        (msg) => msg.receiverId === userId && msg.isRead === 0
      );

      unreadMessages.forEach(async (msg) => {
        try {
          await apiRequest("POST", `/api/messages/${msg.id}/read`, {
            appVersion: APP_VERSION,
          });
        } catch (error) {
          console.error("Failed to mark message as read:", error);
        }
      });
    }
  }, [chatUserId, messages, userId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatUserId && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, chatUserId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageText.trim() || isSending) return;

    const versionOk = await guardAction();
    if (!versionOk) return;

    if (messageText.trim().length > 1000) {
      toast({
        title: "Message Too Long",
        description: "Messages must be 1000 characters or less",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    sendMessageMutation.mutate(messageText);
  };

  // Prevent paste in message input
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    toast({
      title: "Paste Disabled",
      description: "Please type your message manually",
      variant: "destructive",
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
  };

  // Render conversation list view
  if (!chatUserId) {
    return (
      <div className="min-h-screen bg-[#111714] flex flex-col pb-20">
        <UpdateModal />

        {/* Header */}
        <div className="bg-[#1a241f] border-b border-[#2a3c33] p-4 flex items-center justify-between sticky top-0 z-10">
          <button
            onClick={() => setLocation("/community")}
            className="text-white"
            data-testid="button-back"
          >
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <h1 className="text-white font-semibold text-lg">Messages</h1>
          <div className="w-6" />
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-4">
          {conversationsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-[#9eb7a8]">Loading conversations...</div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="bg-[#1a241f] rounded-xl p-8 text-center border border-[#2a3c33]">
              <span className="material-symbols-outlined text-[#6a7f72] text-5xl mb-3 block">mail</span>
              <h3 className="text-white font-semibold mb-2">No Messages Yet</h3>
              <p className="text-[#9eb7a8] text-sm mb-4">
                Start a conversation from a trader's profile
              </p>
              <button
                onClick={() => setLocation("/community")}
                className="bg-[#38e07b] text-[#111714] px-6 py-2 rounded-xl font-semibold"
                data-testid="button-go-to-community"
              >
                Browse Traders
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => (
                <div
                  key={conv.otherUser.id}
                  onClick={() => setLocation(`/messages/${conv.otherUser.id}`)}
                  className="bg-[#1a241f] rounded-xl p-4 border border-[#2a3c33] cursor-pointer hover:border-[#38e07b]/50 transition-colors"
                  data-testid={`conversation-${conv.otherUser.id}`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-[#38e07b]/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#38e07b] text-lg font-bold">
                          {(conv.otherUser.alias || conv.otherUser.name).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      {/* Online status indicator */}
                      {conv.otherUser.lastSeen && 
                        new Date().getTime() - new Date(conv.otherUser.lastSeen).getTime() < 5 * 60 * 1000 && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#38e07b] rounded-full border-2 border-[#1a241f]" />
                      )}
                    </div>

                    {/* Message Preview */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-white font-semibold text-sm truncate">
                          {conv.otherUser.alias || conv.otherUser.name}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="bg-[#38e07b] text-[#111714] text-xs font-bold px-2 py-0.5 rounded-full ml-2">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-[#9eb7a8] text-sm truncate">
                        {conv.lastMessage.content}
                      </p>
                      <p className="text-[#6a7f72] text-xs mt-1">
                        {new Date(conv.lastMessage.createdAt!).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <BottomNav />
      </div>
    );
  }

  // Render chat view
  const otherUser = otherUserProfile?.user;
  const displayName = otherUser?.alias || otherUser?.name || "User";
  const isOnline = otherUser?.lastSeen && 
    new Date().getTime() - new Date(otherUser.lastSeen).getTime() < 5 * 60 * 1000;

  return (
    <div className="min-h-screen bg-[#111714] flex flex-col pb-20">
      <UpdateModal />

      {/* Chat Header */}
      <div className="bg-[#1a241f] border-b border-[#2a3c33] p-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => setLocation(`/trader/${chatUserId}`)}
          className="text-white"
          data-testid="button-back-to-profile"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        
        <div 
          className="flex-1 flex items-center gap-3 cursor-pointer"
          onClick={() => setLocation(`/trader/${chatUserId}`)}
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-[#38e07b]/20 flex items-center justify-center">
              <span className="text-[#38e07b] font-bold">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            {isOnline && (
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#38e07b] rounded-full border-2 border-[#1a241f]" />
            )}
          </div>
          <div>
            <p className="text-white font-semibold">{displayName}</p>
            <p className="text-[#6a7f72] text-xs">
              {isOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        <button
          onClick={() => setLocation("/messages")}
          className="text-white"
          data-testid="button-view-messages"
          title="All Messages"
        >
          <span className="material-symbols-outlined text-2xl">mail</span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messagesLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-[#9eb7a8]">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <span className="material-symbols-outlined text-[#6a7f72] text-5xl mb-3 block">chat</span>
              <p className="text-[#9eb7a8] text-sm">No messages yet. Say hello!</p>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.senderId === userId;
            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                data-testid={`message-${message.id}`}
              >
                <div
                  className={`max-w-[75%] rounded-xl p-3 ${
                    isOwnMessage
                      ? "bg-[#38e07b] text-[#111714]"
                      : "bg-[#1a241f] text-white border border-[#2a3c33]"
                  }`}
                >
                  <p className="text-sm break-words">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isOwnMessage ? "text-[#111714]/70" : "text-[#6a7f72]"
                    }`}
                  >
                    {new Date(message.createdAt!).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-[#1a241f] border-t border-[#2a3c33] p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onPaste={handlePaste}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 bg-[#111714] text-white rounded-xl px-4 py-3 border border-[#2a3c33] focus:ring-2 focus:ring-[#38e07b] outline-none placeholder:text-[#6a7f72]"
            disabled={isSending}
            maxLength={1000}
            data-testid="input-message"
          />
          <button
            type="submit"
            disabled={!messageText.trim() || isSending}
            className="bg-[#38e07b] text-[#111714] px-6 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-send"
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </form>
        <p className="text-[#6a7f72] text-xs mt-2 text-center">
          {messageText.length}/1000 characters
        </p>
      </div>
    </div>
  );
}
