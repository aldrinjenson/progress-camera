import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CameraScreen from './src/CameraScreen';
import CollectionsScreen from './src/CollectionsScreen';
import SettingsScreen from './src/SettingsScreen';
import TimelineScreen from './src/TimelineScreen';
import { useStore } from './src/store';
import { C } from './src/ui';

export type Route = 'camera' | 'collections' | 'timeline' | 'settings';
export type Go = (r: Route, id?: string) => void;

export default function App() {
  const store = useStore();
  const [route, setRoute] = useState<Route>('camera');
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const go: Go = (r, id) => {
    if (id) setSettingsId(id);
    setRoute(r);
  };

  // Android back: settings → collections → camera; timeline → camera. Only the camera exits.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (route === 'settings') return setRoute('collections'), true;
      if (route === 'collections' || route === 'timeline') return setRoute('camera'), true;
      return false;
    });
    return () => sub.remove();
  }, [route]);

  // Tapping a reminder opens the camera on that collection.
  const response = Notifications.useLastNotificationResponse();
  const ready = !!store.state;
  useEffect(() => {
    const id = response?.notification.request.content.data?.collectionId;
    if (ready && typeof id === 'string') {
      store.select(id);
      setRoute('camera');
    }
  }, [response, ready]);

  if (!store.state)
    return (
      <View style={{ flex: 1, backgroundColor: C.ink, justifyContent: 'center' }}>
        <ActivityIndicator color={C.bone} />
      </View>
    );

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {route === 'camera' && <CameraScreen store={store} go={go} />}
      {route === 'collections' && <CollectionsScreen store={store} go={go} />}
      {route === 'timeline' && <TimelineScreen store={store} go={go} />}
      {route === 'settings' && settingsId && <SettingsScreen store={store} go={go} id={settingsId} />}
    </SafeAreaProvider>
  );
}
