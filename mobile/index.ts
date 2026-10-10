// App entry. Background tasks must be defined in global scope before anything else runs,
// so Android can wake the heartbeat task even when no screen is mounted.
import "./src/lib/tracking";
import "expo-router/entry";
