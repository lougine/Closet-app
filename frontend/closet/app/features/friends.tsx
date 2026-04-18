import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { fetchMyFriends, type SocialUser } from "@/services/socialService";
import { useAppTheme } from "../../context/themeContext";

type FriendsTab = "followers" | "following";

export default function FriendsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { isDarkMode } = useAppTheme();
  const initialTab: FriendsTab = params.tab === "following" ? "following" : "followers";
  const [activeTab, setActiveTab] = useState<FriendsTab>(initialTab);
  const [followers, setFollowers] = useState<SocialUser[]>([]);
  const [following, setFollowing] = useState<SocialUser[]>([]);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const palette = useMemo(
    () =>
      isDarkMode
        ? {
            screen: "#121212",
            card: "#1E1E1E",
            border: "#343434",
            text: "#F2F2F2",
            subText: "#A5A5A5",
            tabIdle: "#2A2A2A",
          }
        : {
            screen: "#F7F7F7",
            card: "#FFFFFF",
            border: "#E7E7E7",
            text: "#1E1E1E",
            subText: "#737373",
            tabIdle: "#F1F1F1",
          },
    [isDarkMode],
  );

  const loadFriends = useCallback(async (asRefresh = false) => {
    try {
      if (asRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const payload = await fetchMyFriends();
      setCounts(payload.counts);
      setFollowers(payload.followers || []);
      setFollowing(payload.following || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setActiveTab(params.tab === "following" ? "following" : "followers");
      loadFriends();
    }, [loadFriends, params.tab]),
  );

  const activeUsers = activeTab === "followers" ? followers : following;

  const openUserProfile = (userId: string) => {
    const normalized = String(userId || "").trim();
    if (!normalized) return;

    router.push({
      pathname: "/features/user-profile",
      params: { userId: normalized },
    } as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.screen }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 8,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: "#F0507B", fontSize: 15, fontWeight: "700" }}>Back</Text>
        </TouchableOpacity>
        <Text style={{ color: palette.text, fontSize: 17, fontWeight: "700" }}>Followers & Following</Text>
        <View style={{ width: 36 }} />
      </View>

      <View
        style={{
          marginHorizontal: 14,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: palette.card,
          padding: 4,
          flexDirection: "row",
          gap: 6,
        }}
      >
        <TouchableOpacity
          onPress={() => setActiveTab("followers")}
          style={{
            flex: 1,
            borderRadius: 10,
            paddingVertical: 9,
            alignItems: "center",
            backgroundColor: activeTab === "followers" ? "#F0507B" : palette.tabIdle,
          }}
        >
          <Text style={{ color: activeTab === "followers" ? "#fff" : palette.subText, fontWeight: "700", fontSize: 12 }}>
            Followers
          </Text>
          <Text style={{ color: activeTab === "followers" ? "#fff" : palette.text, fontWeight: "800", fontSize: 12, marginTop: 1 }}>
            {counts.followers}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("following")}
          style={{
            flex: 1,
            borderRadius: 10,
            paddingVertical: 9,
            alignItems: "center",
            backgroundColor: activeTab === "following" ? "#F0507B" : palette.tabIdle,
          }}
        >
          <Text style={{ color: activeTab === "following" ? "#fff" : palette.subText, fontWeight: "700", fontSize: 12 }}>
            Following
          </Text>
          <Text style={{ color: activeTab === "following" ? "#fff" : palette.text, fontWeight: "800", fontSize: 12, marginTop: 1 }}>
            {counts.following}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#F0507B" />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 24, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadFriends(true)} tintColor="#F0507B" />}
        >
          {activeUsers.length === 0 ? (
            <Text style={{ color: palette.subText, fontSize: 13 }}>
              {activeTab === "followers" ? "No followers yet." : "You are not following anyone yet."}
            </Text>
          ) : (
            activeUsers.map((user) => (
              <TouchableOpacity
                key={user._id}
                onPress={() => openUserProfile(user._id)}
                activeOpacity={0.8}
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: palette.border,
                  backgroundColor: palette.card,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.text, fontSize: 13, fontWeight: "700" }}>@{user.username || user.name}</Text>
                  <Text style={{ color: palette.subText, fontSize: 11, marginTop: 2 }}>
                    {user.followerCount} followers • {user.followingCount} following
                  </Text>
                </View>
                <View
                  style={{
                    borderRadius: 999,
                    backgroundColor: palette.tabIdle,
                    borderWidth: 1,
                    borderColor: palette.border,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                  }}
                >
                  <Text style={{ color: palette.subText, fontSize: 11, fontWeight: "700" }}>
                    {activeTab === "following" ? "Following" : "Follower"}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
