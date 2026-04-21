import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AuthenticatedImage from '@/components/AuthenticatedImage';
import { fetchPublicUserProfile, type PublicUserProfile } from '@/services/userProfileService';
import { toggleFollow } from '@/services/socialService';
import { useAppTheme } from '@/context/themeContext';

export default function UserProfileScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const { isDarkMode } = useAppTheme();

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingFollow, setUpdatingFollow] = useState(false);

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
          }
        : {
            screen: '#F7F7F7',
            card: '#FFFFFF',
            border: '#E7E7E7',
            text: '#1E1E1E',
            subText: '#737373',
            muted: '#F1F1F1',
          },
    [isDarkMode],
  );

  const loadProfile = useCallback(async (asRefresh = false) => {
    const normalizedUserId = String(userId || '').trim();
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

      const payload = await fetchPublicUserProfile(normalizedUserId);
      setProfile(payload);
    } catch (error: any) {
      Alert.alert('Profile', error?.message || 'Could not load this profile right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

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
    <View style={{ flex: 1, backgroundColor: palette.screen }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadProfile(true)} tintColor="#F0507B" />}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 8,
          }}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: '#F0507B', fontSize: 15, fontWeight: '700' }}>Back</Text>
          </TouchableOpacity>
          <Text style={{ color: palette.text, fontSize: 17, fontWeight: '700' }}>Profile</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={{ marginHorizontal: 14, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: palette.border, backgroundColor: palette.card }}>
          <View style={{ height: 150, backgroundColor: palette.muted }}>
            {profile.bannerImage ? (
              <AuthenticatedImage source={{ uri: profile.bannerImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : null}
          </View>

          <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14 }}>
            <View style={{ marginTop: -48, marginBottom: 10 }}>
              {profile.profilePicture ? (
                <AuthenticatedImage
                  source={{ uri: profile.profilePicture }}
                  style={{ width: 92, height: 92, borderRadius: 46, borderWidth: 3, borderColor: palette.card }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    width: 92,
                    height: 92,
                    borderRadius: 46,
                    borderWidth: 3,
                    borderColor: palette.card,
                    backgroundColor: palette.muted,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="person" size={30} color={palette.subText} />
                </View>
              )}
            </View>

            <Text style={{ color: palette.text, fontSize: 20, fontWeight: '800' }}>{profile.name || profile.username}</Text>
            <Text style={{ color: palette.subText, marginTop: 2, fontSize: 13 }}>@{profile.username}</Text>

            <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
              <View>
                <Text style={{ color: palette.text, fontSize: 17, fontWeight: '800' }}>{profile.followerCount}</Text>
                <Text style={{ color: palette.subText, fontSize: 12 }}>Followers</Text>
              </View>
              <View>
                <Text style={{ color: palette.text, fontSize: 17, fontWeight: '800' }}>{profile.followingCount}</Text>
                <Text style={{ color: palette.subText, fontSize: 12 }}>Following</Text>
              </View>
            </View>

            {!profile.isMe && (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <TouchableOpacity
                  onPress={onToggleFollow}
                  disabled={updatingFollow}
                  style={{
                    alignSelf: 'flex-start',
                    backgroundColor: profile.isFollowing ? palette.muted : '#F0507B',
                    borderColor: profile.isFollowing ? palette.border : '#F0507B',
                    borderWidth: 1,
                    borderRadius: 999,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ color: profile.isFollowing ? palette.text : '#FFFFFF', fontWeight: '700', fontSize: 12 }}>
                    {updatingFollow ? 'Please wait...' : profile.isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/(tabs)/styling', params: { mode: 'create', userId: profile._id } })}
                  style={{
                    alignSelf: 'flex-start',
                    backgroundColor: palette.card,
                    borderColor: '#F0507B',
                    borderWidth: 1,
                    borderRadius: 999,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ color: '#F0507B', fontWeight: '700', fontSize: 12 }}>
                    Style
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
