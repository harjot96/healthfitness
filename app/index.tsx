import { Redirect } from 'expo-router';

export default function Index() {
  // Default redirect - actual auth check happens in tab layout
  return <Redirect href="/(auth)/login" />;
}

