import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

type Props = {
  since: Date;
};

export function UpdatedAgo({ since }: Props) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const updateSeconds = () => {
      const diff = Math.floor((Date.now() - since.getTime()) / 1000);
      setSeconds(diff >= 0 ? diff : 0);
    };

    updateSeconds(); // Сразу обновляем при монтировании или смене since
    const interval = setInterval(updateSeconds, 1000);

    return () => clearInterval(interval); // Очистка интервала
  }, [since]);

  return <Text style={styles.text}>Обновлено {seconds} сек назад</Text>;
}

const styles = StyleSheet.create({
  text: { fontSize: 13, color: '#6b7280' },
});
