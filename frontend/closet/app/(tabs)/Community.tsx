import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AuthenticatedImage from "../../components/AuthenticatedImage";
import { buildApiUrl, buildAuthHeaders, buildImageUrl } from "../../constants/api";
import { searchUsers, toggleFollow, type SocialUser } from "@/services/socialService";
import createCommunityStyles from "../../Styles/communityStyles";
import { useAppTheme } from "../../context/themeContext";

type CommunityFilter = "for-you" | "friends" | "polls" | "recent";

type CommunityPost = {
  _id: string;
  type: "post" | "poll";
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
  poll: {
    question: string;
    endsAt: string | null;
    options: Array<{
      index: number;
      text: string;
      votes: number;
      votedByMe: boolean;
    }>;
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

const FEED_PAGE_SIZE = 20;

const COMMUNITY_BASE = '/api/community';
const LEGACY_COMMUNITY_BASE = '/community';

const CommunityScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useAppTheme();
  const styles = useMemo(() => createCommunityStyles(isDarkMode), [isDarkMode]);
  const iconColor = isDarkMode ? "#D8D8D8" : "#333";

  const closetItems = [
    require("../../assets/images/favicon.png"),
    require("../../assets/images/favicon.png"),
    require("../../assets/images/favicon.png"),
  ];

  const [feed, setFeed] = useState<CommunityPost[]>([]);
  const [activeFilter, setActiveFilter] = useState<CommunityFilter>("for-you");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SocialUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [updatingFollowUserId, setUpdatingFollowUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [submittingCommentFor, setSubmittingCommentFor] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommunityComment[]>>({});
  const [loadingCommentsByPost, setLoadingCommentsByPost] = useState<Record<string, boolean>>({});
  const [commentDraftByPost, setCommentDraftByPost] = useState<Record<string, string>>({});

  const filterChips = useMemo(
    () => [
      { key: "for-you" as const, label: "For You" },
      { key: "friends" as const, label: "Friends" },
      { key: "polls" as const, label: "Polls" },
      { key: "recent" as const, label: "Recent" },
    ],
    []
  );

  const parseJsonOrThrow = async (res: Response, label: string) => {
    if (!res.ok) {
      throw new Error(`${label} request failed (${res.status})`);
    }
    return res.json();
  };

  const communityFetch = async (path: string, init?: RequestInit) => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const primary = await fetch(buildApiUrl(`${COMMUNITY_BASE}${normalizedPath}`), init);

    if (primary.status === 404) {
      return fetch(buildApiUrl(`${LEGACY_COMMUNITY_BASE}${normalizedPath}`), init);
    }

    return primary;
  };

  const fetchFeed = useCallback(async (options?: { silent?: boolean; append?: boolean; pageOverride?: number }) => {
    const silent = options?.silent || false;
    const append = options?.append || false;
    const targetPage = options?.pageOverride || 1;

    try {
      if (!silent && !append) {
        setLoading(true);
      }

      const token = await SecureStore.getItemAsync("userToken");
      const params = new URLSearchParams();
      params.append("filter", activeFilter);
      params.append("limit", String(FEED_PAGE_SIZE));
      params.append("page", String(targetPage));

      const response = await communityFetch(`/feed?${params.toString()}`, {
        headers: buildAuthHeaders(token),
      });

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
      if (!append) {
        setLoading(false);
      }
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  useFocusEffect(
    useCallback(() => {
      fetchFeed();
    }, [fetchFeed])
  );

  const onRefresh = () => {
    setRefreshing(true);
    setHasMore(true);
    fetchFeed({ silent: true, pageOverride: 1 });
  };

  const onSubmitSearch = () => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }
    void runUserSearch(query);
  };

  const runUserSearch = useCallback(async (query: string) => {
    const normalized = query.trim();
    if (!normalized) {
      setSearchResults([]);
      return;
    }

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

  const openUserProfile = (userId: string) => {
    const normalized = String(userId || "").trim();
    if (!normalized) return;

    router.push({
      pathname: "/features/user-profile",
      params: { userId: normalized },
    } as any);
  };

  useEffect(() => {
    const normalized = searchQuery.trim();
    if (!normalized) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(() => {
      void runUserSearch(normalized);
    }, 300);

    return () => clearTimeout(timeout);
  }, [runUserSearch, searchQuery]);

  const onToggleFollow = async (userId: string) => {
    if (updatingFollowUserId) return;

    try {
      setUpdatingFollowUserId(userId);
      const payload = await toggleFollow(userId);
      setSearchResults((prev) => prev.map((user) => (
        user._id === userId
          ? {
              ...user,
              isFollowing: payload.isFollowing,
              followerCount: payload.targetUser.followerCount,
            }
          : user
      )));
    } catch (error: any) {
      Alert.alert("Community", error.message || "Could not update follow status.");
    } finally {
      setUpdatingFollowUserId(null);
    }
  };

  const loadMore = () => {
    if (loading || loadingMore || refreshing || !hasMore) return;

    setLoadingMore(true);
    fetchFeed({ silent: true, append: true, pageOverride: page + 1 });
  };

  const toggleLike = async (postId: string) => {
    try {
      const token = await SecureStore.getItemAsync("userToken");
      const response = await communityFetch(`/posts/${postId}/like`, {
        method: "POST",
        headers: buildAuthHeaders(token),
      });

      const updated = await parseJsonOrThrow(response, "Like post");
      setFeed((prev) => prev.map((item) => (item._id === postId ? updated : item)));
    } catch (error: any) {
      Alert.alert("Community", error.message || "Could not update like.");
    }
  };

  const voteOnPoll = async (postId: string, optionIndex: number) => {
    try {
      const token = await SecureStore.getItemAsync("userToken");
      const response = await communityFetch(`/posts/${postId}/vote`, {
        method: "POST",
        headers: {
          ...buildAuthHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ optionIndex }),
      });

      const updated = await parseJsonOrThrow(response, "Vote on poll");
      setFeed((prev) => prev.map((item) => (item._id === postId ? updated : item)));
    } catch (error: any) {
      Alert.alert("Community", error.message || "Could not submit vote.");
    }
  };

  const toggleComments = async (postId: string) => {
    const nextExpanded = !expandedComments[postId];
    setExpandedComments((prev) => ({ ...prev, [postId]: nextExpanded }));

    if (!nextExpanded || commentsByPost[postId]) return;

    try {
      setLoadingCommentsByPost((prev) => ({ ...prev, [postId]: true }));
      const token = await SecureStore.getItemAsync("userToken");
      const response = await communityFetch(`/posts/${postId}/comments?limit=20`, {
        headers: buildAuthHeaders(token),
      });
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
      const response = await communityFetch(`/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          ...buildAuthHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      const created = await parseJsonOrThrow(response, "Add comment");

      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: [created, ...(prev[postId] || [])],
      }));
      setCommentDraftByPost((prev) => ({ ...prev, [postId]: "" }));
      setFeed((prev) => prev.map((post) => (
        post._id === postId
          ? { ...post, commentsCount: post.commentsCount + 1 }
          : post
      )));
    } catch (error: any) {
      Alert.alert("Community", error.message || "Could not post comment.");
    } finally {
      setSubmittingCommentFor(null);
    }
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  const renderPost = ({ item: post }: { item: CommunityPost }) => (
    <View style={styles.feedCard}>
      <View style={styles.feedHeader}>
        <TouchableOpacity style={styles.avatarWrap} onPress={() => openUserProfile(post.author._id)} activeOpacity={0.75}>
          {post.author.profilePicture ? (
            <AuthenticatedImage
              source={{ uri: buildImageUrl(post.author.profilePicture) }}
              style={styles.avatar}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={14} color={isDarkMode ? "#A8A8A8" : "#666"} />
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.feedHeaderText}>
          <TouchableOpacity
            onPress={() => openUserProfile(post.author._id)}
            activeOpacity={0.7}
          >
            <Text style={styles.authorName}>{post.author.name}</Text>
          </TouchableOpacity>
          <Text style={styles.postMeta}>{formatDate(post.createdAt)}</Text>
        </View>
      </View>

      {!!post.caption && <Text style={styles.postCaption}>{post.caption}</Text>}

      {!!post.imageUrl && (
        <AuthenticatedImage
          source={{ uri: buildImageUrl(post.imageUrl) }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}

      {post.poll && (
        <View style={styles.pollCard}>
          <Text style={styles.pollQuestion}>{post.poll.question}</Text>
          {post.poll.options.map((option) => (
            <TouchableOpacity
              key={option.index}
              style={[styles.pollOption, option.votedByMe && styles.pollOptionActive]}
              onPress={() => voteOnPoll(post._id, option.index)}
            >
              <Text style={[styles.pollOptionText, option.votedByMe && styles.pollOptionTextActive]}>
                {option.text}
              </Text>
              <Text style={[styles.pollVotes, option.votedByMe && styles.pollOptionTextActive]}>
                {option.votes}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.feedActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => toggleLike(post._id)}>
          <Ionicons
            name={post.likedByMe ? "heart" : "heart-outline"}
            size={18}
            color={post.likedByMe ? "#ff4d73" : iconColor}
          />
          <Text style={styles.actionText}>{post.likeCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => toggleComments(post._id)}>
          <Ionicons name="chatbubble-outline" size={17} color={iconColor} />
          <Text style={styles.actionText}>{post.commentsCount}</Text>
        </TouchableOpacity>
      </View>

      {expandedComments[post._id] && (
        <View style={styles.commentsSection}>
          {loadingCommentsByPost[post._id] ? (
            <ActivityIndicator size="small" color="#ff4d73" />
          ) : (
            <>
              {(commentsByPost[post._id] || []).map((comment) => (
                <View key={comment._id} style={styles.commentRow}>
                  <Text style={styles.commentAuthor}>{comment.author?.name || "User"}</Text>
                  <Text style={styles.commentText}>{comment.text}</Text>
                </View>
              ))}

              <View style={styles.commentComposer}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Add a comment"
                  placeholderTextColor={isDarkMode ? "#888" : "#999"}
                  value={commentDraftByPost[post._id] || ""}
                  onChangeText={(text) => {
                    setCommentDraftByPost((prev) => ({ ...prev, [post._id]: text }));
                  }}
                />
                <TouchableOpacity
                  onPress={() => submitComment(post._id)}
                  disabled={submittingCommentFor === post._id}
                >
                  <Text style={styles.commentSend}>
                    {submittingCommentFor === post._id ? "..." : "Send"}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );

  const listHeader = (
    <>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
      >
        {closetItems.map((item, index) => (
          <View key={index} style={styles.carouselContainer}>
            <Image
              source={item}
              style={styles.carouselImage}
              resizeMode="cover"
            />

            <View style={styles.overlay}>
              <Text style={styles.overlayTitle}>Style This Item You Own</Text>
              <Text style={styles.overlaySub}>
                Get outfit inspiration from your closet
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.chipRow}>
        {filterChips.map((chip) => {
          const active = activeFilter === chip.key;
          return (
            <TouchableOpacity
              key={chip.key}
              style={[styles.chip, active && styles.activeChip]}
              onPress={() => setActiveFilter(chip.key)}
              activeOpacity={0.85}
            >
              <Text style={active ? styles.activeChipText : styles.chipText}>{chip.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );

  const listFooter = (
    <>
      {loadingMore && (
        <View style={styles.loadMoreWrap}>
          <ActivityIndicator size="small" color="#ff4d73" />
          <Text style={styles.loadMoreText}>Loading more posts...</Text>
        </View>
      )}

      {!loadingMore && !hasMore && feed.length > 0 && (
        <Text style={styles.endOfFeedText}>You reached the end of the feed.</Text>
      )}
    </>
  );

  const listEmpty = loading ? (
    <View style={styles.feedLoadingWrap}>
      <ActivityIndicator size="large" color="#ff4d73" />
    </View>
  ) : (
    <View style={styles.emptyStateCard}>
      <Ionicons name="sparkles-outline" size={22} color="#ff4d73" />
      <Text style={styles.emptyStateTitle}>No posts yet</Text>
      <Text style={styles.emptyStateText}>Try another filter or pull to refresh.</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }] }>
      <View style={styles.header}>
        <Ionicons name="search-outline" size={22} color={iconColor} />

        <TextInput
          placeholder="Find users to follow"
          style={styles.searchInput}
          placeholderTextColor={isDarkMode ? "#8F8F8F" : "#888"}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={onSubmitSearch}
          autoCapitalize="none"
          returnKeyType="search"
        />

        <View style={styles.headerIcons}>
          <Ionicons name="notifications-outline" size={22} color={iconColor} />
          <Ionicons name="person-circle-outline" size={24} color={iconColor} />
        </View>
      </View>

      {(searchQuery.trim().length > 0 || searchingUsers) && (
        <View style={styles.userSearchCard}>
          <View style={styles.userSearchHeaderRow}>
            <Text style={styles.userSearchTitle}>User results</Text>
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
                  {user.profilePicture ? (
                    <AuthenticatedImage
                      source={{ uri: user.profilePicture }}
                      style={styles.userAvatar}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.userAvatarPlaceholder}>
                      <Ionicons name="person" size={14} color={isDarkMode ? "#A8A8A8" : "#666"} />
                    </View>
                  )}
                  <View style={styles.userMetaWrap}>
                    <Text style={styles.userNameText}>@{user.username || user.name}</Text>
                    <Text style={styles.userCountsText}>{user.followerCount} followers � {user.followingCount} following</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.followButton, user.isFollowing && styles.followingButton]}
                  onPress={() => onToggleFollow(user._id)}
                  disabled={updatingFollowUserId === user._id}
                >
                  <Text style={[styles.followButtonText, user.isFollowing && styles.followingButtonText]}>
                    {updatingFollowUserId === user._id
                      ? "..."
                      : user.isFollowing
                        ? "Following"
                        : "Follow"}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      )}

      <FlatList
        data={feed}
        keyExtractor={(item) => item._id}
        renderItem={renderPost}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ff4d73" />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.35}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedContentContainer}
        ItemSeparatorComponent={() => <View style={styles.feedItemSeparator} />}
      />
    </View>
  );
};

export default CommunityScreen;
