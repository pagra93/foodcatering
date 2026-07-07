/**
 * Coste (rounds) de bcrypt para hashear contraseñas.
 *
 * 12 es el mínimo recomendado actualmente (L1); antes se usaba 10 en varios
 * sitios de forma dispersa. Los hashes antiguos con coste 10 siguen validando
 * con `bcrypt.compare` sin problema; se re-hashean solos al siguiente cambio de
 * contraseña. Fuente única para no volver a tener el valor repartido.
 */
export const BCRYPT_COST = 12
