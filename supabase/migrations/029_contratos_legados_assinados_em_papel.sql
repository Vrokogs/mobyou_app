-- ============================================================================
-- MOBYOU APP - Contratos dos clientes antigos: assinados em papel
--
-- A 027 deixou como 'cancelado' os contratos das motos legadas. Na prática esses
-- clientes assinaram presencialmente, então o estado correto é 'assinado' com a
-- marca de assinatura presencial (igual ao que a 028 fez com os outros 3).
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

UPDATE contratos c
   SET status = 'assinado',
       assinado_presencial = TRUE,
       updated_at = NOW()
  FROM scooters s
 WHERE c.scooter_id = s.id
   AND s.legado
   AND c.status = 'cancelado';

-- Conferência (opcional):
-- SELECT c.status, c.assinado_presencial, COUNT(*)
--   FROM contratos c JOIN scooters s ON s.id = c.scooter_id
--  WHERE s.legado GROUP BY 1, 2;
