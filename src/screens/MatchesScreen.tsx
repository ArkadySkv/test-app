// src/screens/MatchesScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, FlatList, ActivityIndicator,
  Button, Pressable, RefreshControl, Platform
} from 'react-native';
import { MATCHES_URL } from '../config';
import { FavoriteButton } from '../components/FavoriteButton';
import { UpdatedAgo } from '../components/UpdatedAgo';
import { useFavorites } from '../hooks/useFavorites';

type MatchStatus = 'finished' | 'live' | 'scheduled' | 'postponed';
type FilterType = 'all' | 'upcoming' | 'finished';

type Match = {
  id: string;
  startsAt: string | null;
  status: MatchStatus;
  minute?: number;
  home: { id: string; name: string; city: string };
  away: { id: string; name: string; city: string };
  score: { home: number; away: number } | null;
};

const STATUS_LABELS: Record<MatchStatus, string> = {
  finished: 'Завершен',
  live: 'В прямом эфире',
  scheduled: 'Запланирован',
  postponed: 'Перенесен',
};

export function MatchesScreen() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const { isFavorite, toggle } = useFavorites();

  const fetchMatches = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const response = await fetch(MATCHES_URL);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      setMatches(data.matches || []);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Не удалось загрузить матчи. Проверьте соединение.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMatches(true);
  };

  const filteredMatches = matches.filter((match) => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return match.status === 'scheduled' || match.status === 'live';
    if (filter === 'finished') return match.status === 'finished';
    return true;
  });

  const formatDate = (isoString: string | null) => {
    if (!isoString) return 'Дата не назначена';
    const date = new Date(isoString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  };

  const renderMatch = ({ item }: { item: Match }) => {
    const scoreText = item.score ? `${item.score.home} : ${item.score.away}` : '—';
    const isLive = item.status === 'live';

    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.date}>{formatDate(item.startsAt)}</Text>
          <Text style={[styles.status, isLive && styles.liveStatus]}>
            {STATUS_LABELS[item.status]}
            {isLive && item.minute ? ` ${item.minute}'` : ''}
          </Text>
        </View>
        <View style={styles.teamsRow}>
          <Text style={styles.teamName}>{item.home.name}</Text>
          <Text style={styles.score}>{scoreText}</Text>
          <Text style={styles.teamName}>{item.away.name}</Text>
        </View>
        <View style={styles.footerRow}>
          <FavoriteButton active={isFavorite(item.id)} onPress={() => toggle(item.id)} />
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error && !refreshing) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Повторить" onPress={() => fetchMatches()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Матчи тура</Text>
        <UpdatedAgo since={lastUpdated} />
      </View>
      
      <View style={styles.filterContainer}>
        {(['all', 'upcoming', 'finished'] as FilterType[]).map((f) => (
          <Pressable
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'Все' : f === 'upcoming' ? 'Предстоящие' : 'Завершённые'}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filteredMatches}
        keyExtractor={(item) => item.id}
        renderItem={renderMatch}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>Матчей не найдено</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  topBar: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e5e7eb' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  filterContainer: { flexDirection: 'row', padding: 16, gap: 8 },
  filterBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#e5e7eb' },
  filterBtnActive: { backgroundColor: '#2563eb' },
  filterText: { fontSize: 14, color: '#374151' },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  date: { fontSize: 13, color: '#6b7280' },
  status: { fontSize: 13, color: '#6b7280' },
  liveStatus: { color: '#ef3124', fontWeight: 'bold' },
  teamsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  teamName: { fontSize: 16, fontWeight: '600', flex: 1, textAlign: 'center' },
  score: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 12 },
  footerRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  errorText: { fontSize: 16, marginBottom: 12, textAlign: 'center', color: '#ef3124' },
  emptyText: { fontSize: 16, color: '#6b7280' },
});
