import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import AuthenticatedImage from '@/components/AuthenticatedImage';
import { toggleFollow } from '@/services/socialService';
import {
  fetchPublicUserGarments,
  fetchPublicUserPosts,
  fetchPublicUserProfile,
  type PublicUserGarment,
  type PublicUserPost,
  type PublicUserProfile,
} from '@/services/userProfileService';
import { useAppTheme } from '@/context/themeContext';
import { s } from '../../Styles/index.styles';

const POSTS_PAGE_SIZE = 8;
const { width: W } = Dimensions.get('window');
const WAVE_H = 44;
const AVATAR_SIZE = 88;
const FILTER_TABS = ['All', 'Outerwear', 'Tops', 'Bottoms', 'Footwear', 'Accessories'];

const Wave = ({ fillColor }: { fillColor: string }) => (
  <Svg
    width={W}
    height={WAVE_H}
    viewBox={`0 0 ${W} ${WAVE_H}`}
    preserveAspectRatio="none"
    style={{ position: 'absolute', width: '100%', height: '100%' }}
  >
    <Path
      d={`M0,${WAVE_H} L0,22 Q${W * 0.25},50.6 ${W * 0.5},16.72 Q${W * 0.75},-8.8 ${W},22.88 L${W},${WAVE_H} Z`}
      fill={fillColor}
    />
  </Svg>
);

const normalizeCategory = (category?: string) => {
  if (!category) return '';
  return /^shoes$/i.test(category) ? 'Footwear' : category;
};

export default function UserProfileScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const { isDarkMode } = useAppTheme();

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [garments, setGarments] = useState<PublicUserGarment[]>([]);
  const [posts, setPosts] = useState<PublicUserPost[]>([]);
  const [postsPage, setPostsPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [activeTopTab, setActiveTopTab] = useState<0 | 1>(0);
  const [activeFilter, setActiveFilter] = useState('All');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingFollow, setUpdatingFollow] = useState(false);

  const [selectedGarment, setSelectedGarment] = useState<PublicUserGarment | null>(null);

  const palette = useMemo(
    () =>
      isDarkMode
        ? {
            screen: '#121212',
            card: '#1D1D1D',
            border: '#343434',
            text: '#F2F2F2',
            subText: '#A5A5A5',
            muted: '#2A2A2A',
            topArea: '#3B3B3B',
            pillBg: '#2A2A2A',
          }
        : {
            screen: '#F7F7F7',
            card: '#FFFFFF',
            border: '#E7E7E7',
            text: '#1E1E1E',
            subText: '#737373',
            muted: '#F1F1F1',
            topArea: '#FB92BD',
            pillBg: '#ECECEC',
          },
    [isDarkMode],
  );

  const normalizedUserId = String(userId || '').trim();

  const loadProfile = useCallback(async (asRefresh = false) => {
    if (!normalizedUserId) {
      setLoading(false);
      return;
    }

    try {
      if (asRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [profilePayload, garmentsPayload, postsPayload] = await Promise.all([
        fetchPublicUserProfile(normalizedUserId),
        fetchPublicUserGarments(normalizedUserId, { page: 1, limit: 24 }),
        fetchPublicUserPosts(normalizedUserId, { page: 1, limit: POSTS_PAGE_SIZE }),
      ]);

      setProfile(profilePayload);
      setGarments(garmentsPayload.items || []);
      setPosts(postsPayload.items || []);
      setPostsPage(1);
      setHasMorePosts(1 < Number(postsPayload.pagination.totalPages || 1));
    } catch (error: any) {
      Alert.alert('Profile', error?.message || 'Could not load this profile right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [normalizedUserId]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  const loadMorePosts = async () => {
    if (!hasMorePosts || !normalizedUserId) return;

    const nextPage = postsPage + 1;

    try {
      const payload = await fetchPublicUserPosts(normalizedUserId, { page: nextPage, limit: POSTS_PAGE_SIZE });
      setPosts((prev) => {
        const merged = [...prev, ...(payload.items || [])];
        const seen = new Set<string>();
        return merged.filter((item) => {
          if (seen.has(item._id)) return false;
          seen.add(item._id);
          return true;
        });
      });
      setPostsPage(nextPage);
      setHasMorePosts(nextPage < Number(payload.pagination.totalPages || 1));
    } catch (error: any) {
      Alert.alert('Posts', error?.message || 'Could not load more posts.');
    }
  };

  const onToggleFollow = async () => {
    if (!profile || profile.isMe || updatingFollow) return;

    try {
      setUpdatingFollow(true);
      const payload = await toggleFollow(profile._id);
      setProfile((prev) => (
        prev
          ? {
              ...prev,
              isFollowing: payload.isFollowing,
              followerCount: payload.targetUser.followerCount,
              followingCount: payload.targetUser.followingCount,
            }
          : prev
      ));
    } catch (error: any) {
      Alert.alert('Profile', error?.message || 'Could not update follow status.');
    } finally {
      setUpdatingFollow(false);
    }
  };

  const visibleGarments = useMemo(() => {
    return garments.filter((garment) => {
      const normalizedCategory = normalizeCategory(garment.category);
      const categoryMatch = activeFilter === 'All' || normalizedCategory === activeFilter;
      return categoryMatch;
    });
  }, [activeFilter, garments]);

  const openBuilder = () => {
    if (!profile?._id) return;

    router.push({
      pathname: '/create-outfit-for/[username]',
      params: {
        username: profile.username,
        sourceUserId: profile._id,
        sourceUserName: profile.name || profile.username,
      },
    } as any);
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Account for section horizontal padding (14 * 2) and per-card horizontal margins (3 * 2 * 3).
  const gridCardWidth = useMemo(() => (W - 46) / 3, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.screen, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#F0507B" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.screen, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Text style={{ color: palette.subText, fontSize: 14, textAlign: 'center' }}>User profile not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: '#F0507B', fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: palette.screen }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadProfile(true)} tintColor="#F0507B" />}
      >
        <View style={s.headerShell}>
          <View style={s.headerImg}>
            {profile.bannerImage ? (
              <AuthenticatedImage source={{ uri: profile.bannerImage }} style={s.bgImage} resizeMode="cover" />
            ) : (
              <View style={[s.headerDefault, { backgroundColor: palette.topArea }]} />
            )}
          </View>

          <TouchableOpacity
            onPress={() => router.back()}
            style={[s.settingsBtn, { left: 16, right: undefined }]}
          >
            <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={s.waveWrap}>
            <Wave fillColor={palette.screen} />
          </View>

          <View style={s.profileWrap}>
            {profile.profilePicture ? (
              <AuthenticatedImage
                source={{ uri: profile.profilePicture }}
                style={[s.profilePic, { borderWidth: 3, borderColor: palette.screen }]}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  width: AVATAR_SIZE,
                  height: AVATAR_SIZE,
                  borderRadius: AVATAR_SIZE / 2,
                  borderWidth: 3,
                  borderColor: palette.screen,
                  backgroundColor: isDarkMode ? '#2e2a49' : '#F0507B',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="person" size={34} color="#FFFFFF" />
              </View>
            )}
          </View>
        </View>

        <View style={s.usernameRow}>
          <Text style={[s.username, { color: palette.text }]}>{(profile.name || profile.username).toUpperCase()}</Text>
          <Text style={{ color: palette.subText, marginTop: 2, fontSize: 12 }}>@{profile.username}</Text>
          {!!profile.bio && <Text style={{ color: palette.text, marginTop: 8, fontSize: 13, textAlign: 'center' }}>{profile.bio}</Text>}
        </View>

        <View style={s.socialPillsRow}>
          <View style={[s.socialPill, { borderColor: palette.border, backgroundColor: palette.pillBg }]}>
            <Text style={[s.socialPillNumber, { color: palette.text }]}>{profile.followerCount}</Text>
            <Text style={[s.socialPillLabel, { color: palette.subText }]}>Followers</Text>
          </View>
          <View style={[s.socialPill, { borderColor: palette.border, backgroundColor: palette.pillBg }]}>
            <Text style={[s.socialPillNumber, { color: palette.text }]}>{profile.followingCount}</Text>
            <Text style={[s.socialPillLabel, { color: palette.subText }]}>Following</Text>
          </View>
        </View>

        {!profile.isMe && (
          <View style={s.profileActionsRow}>
            <TouchableOpacity
              onPress={onToggleFollow}
              disabled={updatingFollow}
              style={[s.profileActionBtn, {
                borderColor: profile.isFollowing ? palette.border : '#F0507B',
                backgroundColor: profile.isFollowing ? palette.card : '#F0507B',
              }]}
            >
              <Text style={{ color: profile.isFollowing ? palette.text : '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
                {updatingFollow ? 'Please wait...' : profile.isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={s.profileActionsRow}>
          <TouchableOpacity style={[s.profileActionBtn, { borderColor: '#F0507B' }]} onPress={openBuilder}>
            <Text style={[s.profileActionText, { color: '#F0507B' }]}>Create Outfit for {profile.name || profile.username}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.profileActionBtn, { borderColor: activeTopTab === 1 ? '#F0507B' : palette.border } ]}
            onPress={() => setActiveTopTab((prev) => (prev === 1 ? 0 : 1))}
          >
            <Text style={[s.profileActionText, { color: activeTopTab === 1 ? '#F0507B' : palette.text }]}>
              {activeTopTab === 1 ? 'Garments' : 'Posts History'}
            </Text>
          </TouchableOpacity>
        </View>

        {activeTopTab === 0 ? (
          <View style={{ marginTop: 16, paddingHorizontal: 14 }}>
            <Text style={{ color: palette.text, fontSize: 16, fontWeight: '800', marginBottom: 10 }}>Garments</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.filterTabsContent}
              style={{ marginHorizontal: -14 }}
            >
              {FILTER_TABS.map((label) => {
                const isActive = activeFilter === label;
                return (
                  <TouchableOpacity key={label} style={[s.tab, isActive && s.tabActive]} onPress={() => setActiveFilter(label)}>
                    <Text style={[s.tabText, isActive && s.tabTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {visibleGarments.length === 0 ? (
              <View style={{ borderRadius: 12, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.card, padding: 14 }}>
                <Text style={{ color: palette.subText, fontSize: 12 }}>No garments match this filter.</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {visibleGarments.map((garment) => (
                  <TouchableOpacity
                    key={garment._id}
                    onPress={() => setSelectedGarment(garment)}
                    style={{
                      width: gridCardWidth,
                      aspectRatio: 0.75,
                      margin: 3,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: palette.border,
                      backgroundColor: palette.card,
                      overflow: 'hidden',
                    }}
                  >
                    <View style={{ flex: 1, backgroundColor: palette.muted }}>
                      {garment.imageUrl ? (
                        <AuthenticatedImage source={{ uri: garment.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="shirt-outline" size={22} color={palette.subText} />
                        </View>
                      )}
                    </View>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 7 }}>
                      <Text style={{ color: palette.text, fontWeight: '700', fontSize: 12 }} numberOfLines={1}>{garment.name}</Text>
                      <Text style={{ color: palette.subText, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                        {garment.category}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={{ marginTop: 16, paddingHorizontal: 14 }}>
            <Text style={{ color: palette.text, fontSize: 16, fontWeight: '800', marginBottom: 10 }}>Post History</Text>
            {posts.length === 0 ? (
              <View style={{ borderRadius: 12, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.card, padding: 14 }}>
                <Text style={{ color: palette.subText, fontSize: 12 }}>No posts yet.</Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {posts.map((post) => (
                  <View
                    key={post._id}
                    style={{
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: palette.border,
                      backgroundColor: palette.card,
                      overflow: 'hidden',
                    }}
                  >
                    {!!post.imageUrl && (
                      <AuthenticatedImage source={{ uri: post.imageUrl }} style={{ width: '100%', height: 200 }} resizeMode="cover" />
                    )}
                    <View style={{ padding: 10 }}>
                      {!!post.caption && (
                        <Text style={{ color: palette.text, fontSize: 13, fontWeight: '600' }}>{post.caption}</Text>
                      )}
                      <View style={{ flexDirection: 'row', marginTop: 7, justifyContent: 'space-between' }}>
                        <Text style={{ color: palette.subText, fontSize: 11 }}>{formatDate(post.createdAt)}</Text>
                        <Text style={{ color: palette.subText, fontSize: 11 }}>
                          {post.likeCount} likes • {post.commentsCount} comments
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}

                {hasMorePosts && (
                  <TouchableOpacity
                    onPress={loadMorePosts}
                    style={{
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: palette.border,
                      backgroundColor: palette.card,
                      paddingVertical: 10,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: palette.text, fontSize: 12, fontWeight: '700' }}>Load More Posts</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <Modal
        transparent
        animationType="slide"
        visible={!!selectedGarment}
        onRequestClose={() => setSelectedGarment(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: palette.card, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 14 }}>
            <TouchableOpacity onPress={() => setSelectedGarment(null)} style={{ alignSelf: 'flex-end' }}>
              <Ionicons name="close" size={22} color={palette.text} />
            </TouchableOpacity>

            {!!selectedGarment?.imageUrl && (
              <AuthenticatedImage
                source={{ uri: selectedGarment.imageUrl }}
                style={{ width: '100%', height: 220, borderRadius: 12 }}
                resizeMode="cover"
              />
            )}
            <Text style={{ color: palette.text, fontSize: 17, fontWeight: '800', marginTop: 12 }}>
              {selectedGarment?.name || 'Garment'}
            </Text>
            <Text style={{ color: palette.subText, marginTop: 6, fontSize: 13 }}>
              Category: {selectedGarment?.category || 'N/A'}
            </Text>
            {!!selectedGarment?.color && (
              <Text style={{ color: palette.subText, marginTop: 4, fontSize: 13 }}>Color: {selectedGarment.color}</Text>
            )}
            {!!selectedGarment?.season && (
              <Text style={{ color: palette.subText, marginTop: 4, fontSize: 13 }}>Season: {selectedGarment.season}</Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
