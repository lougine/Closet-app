import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, DeviceEventEmitter, FlatList, Modal, Pressable, RefreshControl, Text, TextInput, TouchableOpacity, View, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AuthenticatedImage from "../../components/AuthenticatedImage";
import { buildAuthHeaders, buildImageUrl, fetchApiWithFallback } from "../../constants/api";
import { fetchMyFriends, searchUsers, toggleFollow, type SocialUser } from "@/services/socialService";
import { fetchCurrentUserProfile } from "@/services/userProfileService";
import createCommunityStyles from "../../Styles/communityStyles";
import { useAppTheme } from "../../context/themeContext";

type CommunityFilter = "for-you" | "friends" | "outfits" | "styled-for";
type StyledForScope = "you" | "by-you" | "all" | "friends";

type CommunityPost = {
  _id: string;
  type: "post";
  sourceType?: string | null;
  sourceOutfitId?: string | null;
  caption: string;
  imageUrl: string | null;
  tags: string[];
  createdAt: string;
  author: {
    _id: string;
    name: string;
    profilePicture: string | null;
  };
  likeCount: number;
  likedByMe: boolean;
  commentsCount: number;
  styledForUser?: {
    _id: string;
    name: string;
    profilePicture: string | null;
  } | null;
  styledByUser?: {
    _id: string;
    name: string;
    profilePicture: string | null;
  } | null;
};

type CommunityComment = {
  _id: string;
  text: string;
  createdAt: string;
  author: {
    _id: string;
    name: string;
    profilePicture: string | null;
  };
};

type RealNotification = {
  _id: string;
  type: "new_post" | "new_follower" | "like" | "comment" | "styled_outfit_shared";
  message: string;
  read: boolean;
  createdAt: string;
  actor: {
    _id: string;
    name: string;
    profilePicture: string | null;
  } | null;
  communityPost: string | null;
  outfit: string | null;
};

const FEED_PAGE_SIZE = 20;
const COMMUNITY_BASE = "/api/community";
const LEGACY_COMMUNITY_BASE = "/community";

const CommunityScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useAppTheme();
  const styles = useMemo(() => createCommunityStyles(isDarkMode), [isDarkMode]);
  const iconColor = isDarkMode ? "#D8D8D8" : "#333";
  const countColor = isDarkMode ? "#F0F0F0" : "#222";

  const [feed, setFeed] = useState<CommunityPost[]>([]);
  const [activeFilter, setActiveFilter] = useState<CommunityFilter>("for-you");
  const [styledForScope, setStyledForScope] = useState<StyledForScope>("you");
  const [hasStyledScopeSelection, setHasStyledScopeSelection] = useState(false);
  const [styledForMenuOpen, setStyledForMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SocialUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [updatingFollowUserId, setUpdatingFollowUserId] = useState<string | null>(null);
  const [followedUserIds, setFollowedUserIds] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string>("");

  const [submittingCommentFor, setSubmittingCommentFor] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommunityComment[]>>({});
  const [loadingCommentsByPost, setLoadingCommentsByPost] = useState<Record<string, boolean>>({});
  const [commentDraftByPost, setCommentDraftByPost] = useState<Record<string, string>>({});

  const [notifVisible, setNotifVisible] = useState(false);
  const [notifications, setNotifications] = useState<RealNotification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [styledMenuAnchor, setStyledMenuAnchor] = useState({ x: 12, y: 140, width: 180, height: 36 });
  const feedListRef = useRef<FlatList<CommunityPost>>(null);
  const communityTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const styledChipRef = useRef<React.ElementRef<typeof TouchableOpacity> | null>(null);
  const authRedirectedRef = useRef(false);

  const filterChips = useMemo(
    () => [
      { key: "for-you" as const, label: "For You" },
      { key: "friends" as const, label: "Friends" },
      { key: "outfits" as const, label: "Outfits" },
      { key: "styled-for" as const, label: "Styled For" },
    ],
    []
  );
  const styledForOptions = useMemo(
    () => [
      { key: "you" as const, label: "Styled For You" },
      { key: "by-you" as const, label: "Styled By You" },
      { key: "all" as const, label: "Styled For All" },
      { key: "friends" as const, label: "Styled For Friends" },
    ],
    []
  );
  const styledChipLabel = useMemo(() => {
    if (!hasStyledScopeSelection) return "Styled For";
    return styledForOptions.find((option) => option.key === styledForScope)?.label || "Styled For";
  }, [hasStyledScopeSelection, styledForOptions, styledForScope]);
  const parseJsonOrThrow = async (res: Response, label: string) => {
    if (!res.ok) throw new Error(`${label} request failed (${res.status})`);
    return res.json();
  };

  const redirectToAuth = useCallback(async () => {
    if (authRedirectedRef.current) return;
    authRedirectedRef.current = true;
    try {
      await SecureStore.deleteItemAsync("userToken");
    } catch {}
    router.replace("/authentication" as any);
  }, [router]);

  const communityFetch = async (path: string, init?: RequestInit) => {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const primary = await fetchApiWithFallback(`${COMMUNITY_BASE}${normalizedPath}`, init, {
      timeoutMs: 12000,
      retries: 1,
    });
    if (primary.status === 404) {
      return fetchApiWithFallback(`${LEGACY_COMMUNITY_BASE}${normalizedPath}`, init, {
        timeoutMs: 12000,
        retries: 1,
      });
    }
    return primary;
  };

  const fetchNotifications = useCallback(async () => {
    try {
      setNotifLoading(true);
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        setNotifications([]);
        setUnreadCount(0);
        await redirectToAuth();
        return;
      }
      const response = await communityFetch("/notifications?limit=30", {
        headers: buildAuthHeaders(token),
      });

      if (response.status === 404) {
        const legacyResponse = await fetchApiWithFallback("/api/users/me/notifications", {
          headers: buildAuthHeaders(token),
        }, {
          timeoutMs: 12000,
          retries: 1,
        });

        if (!legacyResponse.ok) {
          if (legacyResponse.status === 401 || legacyResponse.status === 403) {
            setNotifications([]);
            setUnreadCount(0);
            await redirectToAuth();
            return;
          }
          if (legacyResponse.status === 404) {
            setNotifications([]);
            setUnreadCount(0);
            return;
          }
          throw new Error(`Notifications request failed (${legacyResponse.status})`);
        }

        const legacyData = await legacyResponse.json();
        const incoming = Array.isArray(legacyData?.notifications) ? legacyData.notifications : [];

        const mapped: RealNotification[] = incoming.map((item: any) => ({
          _id: String(item?._id || ""),
          type: item?.type || "new_post",
          message: String(item?.message || ""),
          read: Boolean(item?.readAt),
          createdAt: item?.createdAt || new Date().toISOString(),
          actor: item?.actor
            ? {
                _id: String(item.actor._id || ""),
                name: String(item.actor.name || "Someone"),
                profilePicture: item.actor.profilePicture || null,
              }
            : null,
          communityPost: item?.communityPostId ? String(item.communityPostId) : null,
          outfit: item?.outfitId ? String(item.outfitId) : null,
        })).filter((item: RealNotification) => item._id && item.message);

        setNotifications(mapped);
        setUnreadCount(mapped.filter((item) => !item.read).length);
        return;
      }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setNotifications([]);
          setUnreadCount(0);
          await redirectToAuth();
          return;
        }
        if (response.status === 404) {
          setNotifications([]);
          setUnreadCount(0);
          return;
        }
        throw new Error(`Notifications request failed (${response.status})`);
      }

      const data = await parseJsonOrThrow(response, "Notifications");
      setNotifications(data.items || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error: any) {
      if (!String(error?.message || '').includes('(404)')) {
        console.warn("Notifications temporarily unavailable:", error?.message || error);
      }
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setNotifLoading(false);
    }
  }, [redirectToAuth]);

  const markNotificationsRead = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        await redirectToAuth();
        return;
      }
      await communityFetch("/notifications/read", {
        method: "POST",
        headers: buildAuthHeaders(token),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  }, [redirectToAuth]);

  const fetchRelationshipState = useCallback(async () => {
    try {
      const [friendsPayload, me] = await Promise.all([
        fetchMyFriends(),
        fetchCurrentUserProfile(),
      ]);

      const followingIds = new Set(
        (friendsPayload?.following || [])
          .map((user) => String(user?._id || ""))
          .filter(Boolean)
      );

      setFollowedUserIds(followingIds);
      setCurrentUserId(String(me?._id || ""));
    } catch {
      setFollowedUserIds(new Set());
    }
  }, []);

  const fetchFeed = useCallback(
    async (options?: { silent?: boolean; append?: boolean; pageOverride?: number }) => {
      const silent = options?.silent || false;
      const append = options?.append || false;
      const targetPage = options?.pageOverride || 1;

      try {
        if (!silent && !append) setLoading(true);

        const token = await SecureStore.getItemAsync("userToken");
        if (!token) {
          setFeed([]);
          setHasMore(false);
          setPage(1);
          await redirectToAuth();
          return;
        }
        const params = new URLSearchParams();
        params.append("filter", activeFilter);
        if (activeFilter === "styled-for") {
          params.append("styledScope", styledForScope);
        }
        params.append("limit", String(FEED_PAGE_SIZE));
        params.append("page", String(targetPage));

        const response = await communityFetch(`/feed?${params.toString()}`, {
          headers: buildAuthHeaders(token),
        });
        if (response.status === 401 || response.status === 403) {
          setFeed([]);
          setHasMore(false);
          setPage(1);
          await redirectToAuth();
          return;
        }

        const data = await parseJsonOrThrow(response, "Community feed");
        const incomingItems: CommunityPost[] = data.items || [];

        setFeed((prev) => {
          if (!append) return incomingItems;
          const merged = [...prev, ...incomingItems];
          const seen = new Set<string>();
          return merged.filter((item) => {
            if (seen.has(item._id)) return false;
            seen.add(item._id);
            return true;
          });
        });

        setPage(targetPage);
        const totalPages = Number(data?.pagination?.totalPages || 1);
        setHasMore(targetPage < totalPages);
      } catch (error: any) {
        console.error("Failed to load community feed:", error);
        Alert.alert("Community", error.message || "Could not load feed right now.");
      } finally {
        if (!append) setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [activeFilter, styledForScope, redirectToAuth]
  );

  useFocusEffect(
    useCallback(() => {
      fetchFeed();
      fetchNotifications();
      fetchRelationshipState();
    }, [fetchFeed, fetchNotifications, fetchRelationshipState])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setHasMore(true);
    fetchFeed({ silent: true, pageOverride: 1 });
    fetchNotifications();
    fetchRelationshipState();
  }, [fetchFeed, fetchNotifications, fetchRelationshipState]);

  const loadMore = () => {
    if (loading || loadingMore || refreshing || !hasMore) return;
    setLoadingMore(true);
    fetchFeed({ silent: true, append: true, pageOverride: page + 1 });
  };

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener("community-tab-press", () => {
      if (communityTapTimerRef.current) {
        clearTimeout(communityTapTimerRef.current);
        communityTapTimerRef.current = null;
        onRefresh();
        return;
      }
      communityTapTimerRef.current = setTimeout(() => {
        feedListRef.current?.scrollToOffset({ offset: 0, animated: true });
        setStyledForMenuOpen(false);
        communityTapTimerRef.current = null;
      }, 240);
    });

    return () => {
      subscription.remove();
      if (communityTapTimerRef.current) {
        clearTimeout(communityTapTimerRef.current);
        communityTapTimerRef.current = null;
      }
    };
  }, [onRefresh]);

  const runUserSearch = useCallback(async (query: string) => {
    const normalized = query.trim();
    if (!normalized) { setSearchResults([]); return; }
    try {
      setSearchingUsers(true);
      const results = await searchUsers(normalized, 20);
      setSearchResults(results);
    } catch (error: any) {
      Alert.alert("Community", error.message || "Could not search users right now.");
    } finally {
      setSearchingUsers(false);
    }
  }, []);

  const onSubmitSearch = () => {
    const query = searchQuery.trim();
    if (!query) { setSearchResults([]); return; }
    void runUserSearch(query);
  };

  useEffect(() => {
    const normalized = searchQuery.trim();
    if (!normalized) { setSearchResults([]); return; }
    const timeout = setTimeout(() => void runUserSearch(normalized), 300);
    return () => clearTimeout(timeout);
  }, [runUserSearch, searchQuery]);

  const onToggleFollow = async (userId: string) => {
    if (updatingFollowUserId) return;
    try {
      setUpdatingFollowUserId(userId);
      const payload = await toggleFollow(userId);
      setSearchResults((prev) =>
        prev.map((user) =>
          user._id === userId
            ? { ...user, isFollowing: payload.isFollowing, followerCount: payload.targetUser.followerCount }
            : user
        )
      );
      setFollowedUserIds((prev) => {
        const next = new Set(prev);
        if (payload.isFollowing) {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
    } catch (error: any) {
      Alert.alert("Community", error.message || "Could not update follow status.");
    } finally {
      setUpdatingFollowUserId(null);
    }
  };

  const followPostAuthor = async (authorId: string) => {
    if (!authorId || updatingFollowUserId) return;
    await onToggleFollow(authorId);
  };

  const toggleLike = async (postId: string) => {
    try {
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        await redirectToAuth();
        return;
      }
      const response = await communityFetch(`/posts/${postId}/like`, {
        method: "POST",
        headers: buildAuthHeaders(token),
      });
      if (response.status === 401 || response.status === 403) {
        await redirectToAuth();
        return;
      }
      const updated = await parseJsonOrThrow(response, "Like post");
      setFeed((prev) => prev.map((item) => (item._id === postId ? updated : item)));
    } catch (error: any) {
      Alert.alert("Community", error.message || "Could not update like.");
    }
  };

  const toggleComments = async (postId: string) => {
    const nextExpanded = !expandedComments[postId];
    setExpandedComments((prev) => ({ ...prev, [postId]: nextExpanded }));
    if (!nextExpanded || commentsByPost[postId]) return;

    try {
      setLoadingCommentsByPost((prev) => ({ ...prev, [postId]: true }));
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        await redirectToAuth();
        return;
      }
      const response = await communityFetch(`/posts/${postId}/comments?limit=20`, {
        headers: buildAuthHeaders(token),
      });
      if (response.status === 401 || response.status === 403) {
        await redirectToAuth();
        return;
      }
      const data = await parseJsonOrThrow(response, "Load comments");
      setCommentsByPost((prev) => ({ ...prev, [postId]: data.items || [] }));
    } catch (error: any) {
      Alert.alert("Community", error.message || "Could not load comments.");
    } finally {
      setLoadingCommentsByPost((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const submitComment = async (postId: string) => {
    const text = (commentDraftByPost[postId] || "").trim();
    if (!text) return;

    try {
      setSubmittingCommentFor(postId);
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        await redirectToAuth();
        return;
      }
      const response = await communityFetch(`/posts/${postId}/comments`, {
        method: "POST",
        headers: { ...buildAuthHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (response.status === 401 || response.status === 403) {
        await redirectToAuth();
        return;
      }
      const created = await parseJsonOrThrow(response, "Add comment");
      setCommentsByPost((prev) => ({ ...prev, [postId]: [created, ...(prev[postId] || [])] }));
      setCommentDraftByPost((prev) => ({ ...prev, [postId]: "" }));
      setFeed((prev) =>
        prev.map((post) =>
          post._id === postId ? { ...post, commentsCount: post.commentsCount + 1 } : post
        )
      );
    } catch (error: any) {
      Alert.alert("Community", error.message || "Could not post comment.");
    } finally {
      setSubmittingCommentFor(null);
    }
  };

  const openNotifications = async () => {
    setNotifVisible(true);
    await markNotificationsRead();
  };

  const notifIconForType = (type: RealNotification["type"]) => {
    if (type === "new_post") return "shirt-outline";
    if (type === "like") return "heart-outline";
    if (type === "comment") return "chatbubble-outline";
    if (type === "styled_outfit_shared") return "sparkles-outline";
    return "person-add-outline";
  };

  const openUserProfile = (userId: string) => {
    const normalized = String(userId || "").trim();
    if (!normalized) return;
    router.push({ pathname: "/features/user-profile", params: { userId: normalized } } as any);
  };

  const goToSettings = () => router.push("/features/settings" as any);

  const toggleStyledMenu = () => {
    const node = styledChipRef.current as any;
    if (node?.measureInWindow) {
      node.measureInWindow((x: number, y: number, width: number, height: number) => {
        setStyledMenuAnchor({
          x: Number.isFinite(x) ? x : 12,
          y: Number.isFinite(y) ? y : 140,
          width: Number.isFinite(width) ? width : 180,
          height: Number.isFinite(height) ? height : 36,
        });
        setStyledForMenuOpen((prev) => !prev);
      });
      return;
    }
    setStyledForMenuOpen((prev) => !prev);
  };

  const formatTimeAgo = (value: string) => {
    const now = Date.now();
    const diff = now - new Date(value).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const getPostLabel = (post: CommunityPost) => {
    if (post.sourceType === "outfit") return "Outfit";
    return null;
  };

  const renderAvatar = (
    picture: string | null,
    size: number,
    onPress?: () => void
  ) => {
    const radius = size / 2;
    const avatarStyle = { width: size, height: size, borderRadius: radius };
    const placeholderStyle = {
      width: size,
      height: size,
      borderRadius: radius,
      backgroundColor: isDarkMode ? "#2C2C2C" : "#efefef",
      alignItems: "center" as const,
      justifyContent: "center" as const,
    };

    const inner = picture ? (
      <AuthenticatedImage
        source={{ uri: buildImageUrl(picture) }}
        style={avatarStyle}
        resizeMode="cover"
      />
    ) : (
      <View style={placeholderStyle}>
        <Ionicons name="person" size={size * 0.4} color={isDarkMode ? "#A8A8A8" : "#666"} />
      </View>
    );

    if (onPress) {
      return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
          {inner}
        </TouchableOpacity>
      );
    }
    return inner;
  };

  const renderPost = ({ item: post }: { item: CommunityPost }) => {
    const label = getPostLabel(post);
    const isStyledPost = Boolean(
      post.sourceType === "outfit" &&
      post.styledForUser?._id &&
      post.styledByUser?._id &&
      String(post.styledForUser._id) !== String(post.styledByUser._id)
    );
    const isOwnPost = Boolean(currentUserId) && String(post.author._id) === String(currentUserId);
    const isFollowingAuthor = followedUserIds.has(String(post.author._id));
    const showSuggestedFollow = activeFilter !== "friends" && !isStyledPost && !isOwnPost && !isFollowingAuthor;
    const styledForName = post.styledForUser?.name || "User";
    const styledByName = post.styledByUser?.name || post.author.name || "User";
    const postTitle = isStyledPost
      ? `Styled for ${styledForName} by ${styledByName}`
      : post.author.name;
    const postSubtitle = isStyledPost
      ? "following"
      : (showSuggestedFollow ? "suggested for you" : formatTimeAgo(post.createdAt));

    return (
      <View style={styles.postBlock}>
        <View style={styles.feedCard}>
          <View style={styles.feedHeader}>
            {renderAvatar(post.author.profilePicture, 38, () => openUserProfile(post.author._id))}
            <View style={styles.feedHeaderText}>
              <View style={styles.feedHeaderTop}>
                <TouchableOpacity onPress={() => openUserProfile(post.author._id)} activeOpacity={0.7}>
                  <Text style={styles.authorName}>{postTitle}</Text>
                </TouchableOpacity>
                {label && (
                  <View style={styles.postTypeBadge}>
                    <Text style={styles.postTypeBadgeText}>{label}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.postMeta}>{postSubtitle}</Text>
            </View>
            {showSuggestedFollow && (
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.followPillBtn}
                onPress={() => followPostAuthor(post.author._id)}
                disabled={updatingFollowUserId === post.author._id}
              >
                <Text style={styles.followPillBtnText}>
                  {updatingFollowUserId === post.author._id ? "..." : "Follow"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {!!post.imageUrl && (
            <TouchableOpacity
              activeOpacity={post.sourceOutfitId ? 0.9 : 1}
              onPress={() => {
                if (!post.sourceOutfitId) return;
                router.push({
                  pathname: "/wardrobe/outfit-detail" as any,
                  params: { outfitId: post.sourceOutfitId },
                });
              }}
              style={styles.postImageWrap}
            >
              <AuthenticatedImage
                source={{ uri: buildImageUrl(post.imageUrl) }}
                style={styles.postImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}

        </View>

        <View style={styles.feedActions}>
          <View style={styles.feedActionsLeft}>
            <TouchableOpacity style={styles.actionButton} onPress={() => toggleLike(post._id)}>
              <Ionicons
                name={post.likedByMe ? "heart" : "heart-outline"}
                size={18}
                color={post.likedByMe ? "#ff4d73" : iconColor}
              />
              <Text style={[styles.actionText, { color: countColor }]}>{post.likeCount || 0}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              activeOpacity={0.8}
              onPress={() => toggleComments(post._id)}
            >
              <Ionicons
                name={expandedComments[post._id] ? "chatbubble" : "chatbubble-outline"}
                size={17}
                color={iconColor}
              />
              <Text style={[styles.actionText, { color: countColor }]}>{post.commentsCount || 0}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments */}
        {expandedComments[post._id] && (
          <View style={styles.commentsSection}>
            {loadingCommentsByPost[post._id] ? (
              <ActivityIndicator size="small" color="#ff4d73" />
            ) : (
              <>
                {(commentsByPost[post._id] || []).map((comment) => (
                  <View key={comment._id} style={styles.commentRow}>
                    {renderAvatar(comment.author?.profilePicture, 24)}
                    <View style={styles.commentBubble}>
                      <Text style={styles.commentAuthor}>{comment.author?.name || "User"}</Text>
                      <Text style={styles.commentText}>{comment.text}</Text>
                    </View>
                  </View>
                ))}
                <View style={styles.commentComposer}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Add a comment..."
                    placeholderTextColor={isDarkMode ? "#666" : "#aaa"}
                    value={commentDraftByPost[post._id] || ""}
                    onChangeText={(text) =>
                      setCommentDraftByPost((prev) => ({ ...prev, [post._id]: text }))
                    }
                  />
                  <TouchableOpacity
                    onPress={() => submitComment(post._id)}
                    disabled={submittingCommentFor === post._id}
                    style={styles.commentSendBtn}
                  >
                    <Ionicons
                      name="send"
                      size={16}
                      color={submittingCommentFor === post._id ? "#ccc" : "#ff4d73"}
                    />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  const listHeader = (
    <View>
      <View style={styles.header}>
        <Ionicons name="search-outline" size={18} color={isDarkMode ? "#888" : "#aaa"} />
        <TextInput
          placeholder="Find users to follow"
          style={styles.searchInput}
          placeholderTextColor={isDarkMode ? "#666" : "#aaa"}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={onSubmitSearch}
          autoCapitalize="none"
          returnKeyType="search"
        />
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={openNotifications} style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color={iconColor} />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={goToSettings}>
            <Ionicons name="person-circle-outline" size={26} color={iconColor} />
          </TouchableOpacity>
        </View>
      </View>

      {(searchQuery.trim().length > 0 || searchingUsers) && (
        <View style={styles.userSearchCard}>
          <View style={styles.userSearchHeaderRow}>
            <Text style={styles.userSearchTitle}>People</Text>
            {searchingUsers && <ActivityIndicator size="small" color="#ff4d73" />}
          </View>
          {!searchingUsers && searchResults.length === 0 ? (
            <Text style={styles.userSearchEmptyText}>No users found.</Text>
          ) : (
            searchResults.map((user) => (
              <View key={user._id} style={styles.userRow}>
                <TouchableOpacity
                  style={styles.userRowLeft}
                  onPress={() => openUserProfile(user._id)}
                  activeOpacity={0.7}
                >
                  {renderAvatar(user.profilePicture, 36, () => openUserProfile(user._id))}
                  <View style={styles.userMetaWrap}>
                    <Text style={styles.userNameText}>@{user.username || user.name}</Text>
                    <Text style={styles.userCountsText}>{user.followerCount} followers</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.followButton, user.isFollowing && styles.followingButton]}
                  onPress={() => onToggleFollow(user._id)}
                  disabled={updatingFollowUserId === user._id}
                >
                  <Text style={[styles.followButtonText, user.isFollowing && styles.followingButtonText]}>
                    {updatingFollowUserId === user._id ? "..." : user.isFollowing ? "Following" : "Follow"}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      )}

      <View style={styles.chipHeaderWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {filterChips.map((chip) => {
            const active = activeFilter === chip.key;
            const isStyledChip = chip.key === "styled-for";
            return (
              <View key={chip.key} style={styles.chipItemWrap}>
                <TouchableOpacity
                  ref={isStyledChip ? styledChipRef : undefined}
                  style={[styles.chip, active && styles.activeChip]}
                  onPress={() => {
                    if (isStyledChip) {
                      setActiveFilter("styled-for");
                      toggleStyledMenu();
                      return;
                    }
                    setActiveFilter(chip.key);
                    setStyledForScope("you");
                    setHasStyledScopeSelection(false);
                    setStyledForMenuOpen(false);
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.styledChipContent}>
                    <Text style={active ? styles.activeChipText : styles.chipText}>
                      {isStyledChip ? styledChipLabel : chip.label}
                    </Text>
                    {isStyledChip && (
                      <Ionicons
                        name={styledForMenuOpen && active ? "chevron-up" : "chevron-down"}
                        size={13}
                        color={active ? "#fff" : (isDarkMode ? "#C9C9C9" : "#111")}
                      />
                    )}
                  </View>
                </TouchableOpacity>

              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  const listFooter = (
    <>
      {loadingMore && (
        <View style={styles.loadMoreWrap}>
          <ActivityIndicator size="small" color="#ff4d73" />
        </View>
      )}
      {!loadingMore && !hasMore && feed.length > 0 && (
        <Text style={styles.endOfFeedText}>You&apos;re all caught up ✨</Text>
      )}
    </>
  );

  const listEmpty = loading ? (
    <View style={styles.feedLoadingWrap}>
      <ActivityIndicator size="large" color="#ff4d73" />
    </View>
  ) : (
    <View style={styles.emptyStateCard}>
      <Ionicons name="sparkles-outline" size={24} color="#ff4d73" />
      <Text style={styles.emptyStateTitle}>
        {activeFilter === "friends"
          ? (followedUserIds.size === 0 ? "Follow your friends" : "No posts from friends yet")
          : "Nothing here yet"}
      </Text>
      <Text style={styles.emptyStateText}>
        {activeFilter === "friends"
          ? (followedUserIds.size === 0
              ? "You're not following anyone yet."
              : "Follow people to see their posts here.")
          : "Try another filter or pull to refresh."}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        ref={feedListRef}
        data={feed}
        keyExtractor={(item) => item._id}
        renderItem={renderPost}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ff4d73" />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.35}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedContentContainer}
      />

      <Modal
        visible={activeFilter === "styled-for" && styledForMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setStyledForMenuOpen(false)}
      >
        <Pressable style={styles.dropdownBackdrop} onPress={() => setStyledForMenuOpen(false)}>
          <Pressable
            style={[
              styles.styledDropdownPortal,
              {
                top: styledMenuAnchor.y + styledMenuAnchor.height + 6,
                left: styledMenuAnchor.x,
                minWidth: Math.max(180, styledMenuAnchor.width),
              },
            ]}
            onPress={() => {}}
          >
            {styledForOptions.map((option) => {
              const selected = styledForScope === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.styledDropdownOption, selected && styles.styledDropdownOptionActive]}
                  onPress={() => {
                    setStyledForScope(option.key);
                    setHasStyledScopeSelection(true);
                    setStyledForMenuOpen(false);
                  }}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.styledDropdownOptionText,
                      selected && styles.styledDropdownOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={notifVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setNotifVisible(false)}
      >
        <TouchableOpacity
          style={styles.notifOverlay}
          activeOpacity={1}
          onPress={() => setNotifVisible(false)}
        >
          <View style={styles.notifSheet}>
            <View style={styles.notifSheetHandle} />
            <Text style={styles.notifSheetTitle}>Notifications</Text>

            {notifLoading ? (
              <ActivityIndicator color="#ff4d73" style={{ paddingVertical: 30 }} />
            ) : notifications.length === 0 ? (
              <View style={styles.notifEmptyWrap}>
                <Ionicons name="notifications-off-outline" size={32} color={isDarkMode ? "#444" : "#ddd"} />
                <Text style={styles.notifEmpty}>Nothing new yet</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {notifications.map((n) => (
                  <View key={n._id} style={[styles.notifRow, !n.read && styles.notifRowUnread]}>
                    <View style={styles.notifAvatarWrap}>
                      {n.actor?.profilePicture ? (
                        <AuthenticatedImage
                          source={{ uri: buildImageUrl(n.actor.profilePicture) }}
                          style={styles.notifAvatar}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.notifAvatar, styles.notifAvatarPlaceholder]}>
                          <Ionicons name={notifIconForType(n.type)} size={16} color="#ff4d73" />
                        </View>
                      )}
                      {/* type icon overlay */}
                      <View style={styles.notifTypeIcon}>
                        <Ionicons name={notifIconForType(n.type)} size={10} color="#fff" />
                      </View>
                    </View>
                    <View style={styles.notifTextWrap}>
                      <Text style={styles.notifMessage}>{n.message}</Text>
                      <Text style={styles.notifTime}>{formatTimeAgo(n.createdAt)}</Text>
                    </View>
                    {!n.read && <View style={styles.notifDot} />}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default CommunityScreen;


