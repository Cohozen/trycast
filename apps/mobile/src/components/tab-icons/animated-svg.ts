import Animated from 'react-native-reanimated';
import { Circle, Line, Path } from 'react-native-svg';

/**
 * Wrappers animés des primitives react-native-svg, créés UNE SEULE FOIS au
 * niveau module (les recréer dans un rendu remonterait le nœud natif à chaque
 * passe, et les dupliquer par icône dupliquerait la classe Line animée entre
 * « Mes matchs » et « Classement »).
 *
 * Ces wrappers n'animent que des props SCALAIRES natives (x1/x2, y2, cy,
 * strokeDashoffset, opacity). Surtout pas `transform` : ce n'est pas une prop
 * native de react-native-svg — elle est convertie en `matrix` par une couche
 * JS qu'un useAnimatedProps court-circuite, et la valeur se perdrait dans les
 * props de la vue hôte, sans effet sur le dessin.
 */
export const AnimatedCircle = Animated.createAnimatedComponent(Circle);
export const AnimatedLine = Animated.createAnimatedComponent(Line);
export const AnimatedPath = Animated.createAnimatedComponent(Path);
