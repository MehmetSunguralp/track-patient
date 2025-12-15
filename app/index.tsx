import CustomStatusBar from '@/components/custom/StatusBar';
import { ThemedView } from '@/components/themed-view';
import { usePatients } from '@/hooks/PatientsContext';
import { useRouter } from 'expo-router';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PatientsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { patients, selectedPatientId, setSelectedPatientId } = usePatients();

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 72 }]}>
      <CustomStatusBar variant="patients-list" />
      <Text style={styles.heading}>Patients</Text>
      <FlatList
        data={patients}
        numColumns={4}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.avatarGrid}
        renderItem={({ item }) => {
          const isSelected = item.id === selectedPatientId;

          return (
            <Pressable
              style={styles.avatarItem}
              onPress={() => {
                setSelectedPatientId(item.id);
                router.push('/(tabs)');
              }}
            >
              <View
                style={[
                  styles.avatarWrapper,
                  item.isConnected && styles.avatarConnected,
                  isSelected && styles.avatarSelected,
                ]}
              >
                <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} />
              </View>
              <Text style={styles.avatarName} numberOfLines={1}>
                {item.firstName}
              </Text>
            </Pressable>
          );
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 4,
    color: '#ffffff',
  },
  avatarGrid: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  avatarItem: {
    flex: 1 / 4,
    alignItems: 'center',
    marginVertical: 8,
  },
  avatarWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#2c3e50',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1c2833',
  },
  avatarConnected: {
    borderColor: '#27AE60',
  },
  avatarSelected: {
    borderWidth: 3,
    shadowColor: '#27AE60',
    shadowOpacity: 0.7,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarName: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
  },
});
