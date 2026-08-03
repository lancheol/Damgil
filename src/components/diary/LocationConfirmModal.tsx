import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { MapLocation } from '../../utils/placeSearch';
import { colors, radii, spacing, typography } from '../../theme';

type LocationConfirmModalProps = {
  visible: boolean;
  location: MapLocation | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export function LocationConfirmModal({
  visible,
  location,
  onConfirm,
  onCancel,
}: LocationConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {location ? (
            <MapView
              style={styles.map}
              pointerEvents="none"
              initialRegion={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              <Marker
                coordinate={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                }}
                title={location.name}
              />
            </MapView>
          ) : (
            <View style={[styles.map, styles.mapPlaceholder]} />
          )}

          <Text style={styles.question}>이 장소가 맞나요?</Text>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={({ pressed }) => [styles.button, styles.noButton, pressed && styles.pressed]}
            >
              <Text style={styles.buttonText}>아니오</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              style={({ pressed }) => [styles.button, styles.yesButton, pressed && styles.pressed]}
            >
              <Text style={styles.buttonText}>네</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  map: {
    width: '100%',
    height: 200,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    backgroundColor: colors.border,
  },
  question: {
    ...typography.brandTitle,
    fontSize: 18,
    textAlign: 'center',
    color: colors.ink,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noButton: {
    backgroundColor: '#9A9A9A',
  },
  yesButton: {
    backgroundColor: colors.black,
  },
  buttonText: {
    ...typography.button,
    color: colors.white,
  },
  pressed: {
    opacity: 0.88,
  },
});
