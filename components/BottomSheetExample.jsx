// BottomSheetExample.js
import React, { useRef, useMemo } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { BottomSheetModal, BottomSheetModalProvider } from '@gorhom/bottom-sheet';

const BottomSheetExample = () => {
  const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ['50%'], []);

  const handlePresentModal = () => {
    bottomSheetRef.current?.present();
  };

  const handleDismissModal = () => {
    bottomSheetRef.current?.dismiss();
  };

  return (
    <BottomSheetModalProvider>
      <View style={styles.container}>
        <Button title="Show Bottom Sheet" onPress={handlePresentModal} />

        {/* Ensure BottomSheetModal is outside of other Views */}
        <BottomSheetModal
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          onDismiss={handleDismissModal}
        >
          <View style={styles.contentContainer}>
            <Text style={styles.title}>Hello, I'm a Bottom Sheet!</Text>
            <Button title="Close" onPress={handleDismissModal} />
          </View>
        </BottomSheetModal>
      </View>
    </BottomSheetModalProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20, // Add padding if needed
  },
  title: {
    fontSize: 20,
    marginBottom: 20,
  },
});

export default BottomSheetExample;
