-- Illustrative admin-only design preview. Do not publish as a real product.
with sample as (
  insert into public.products (
    title, slug, subtitle, badge, summary, content, cover_url, hero_url,
    gallery, detail, status, retail_enabled, is_demo
  ) values (
    'Fresh Linen Home Fragrance Oil', 'fresh-linen-home-fragrance-oil-design-preview',
    'Crisp. Clean. Comforting.', 'Design sample',
    'An illustrative home fragrance oil for reviewing the new retail product page layout.',
    'Illustrative product content. Replace with verified product specifications before publication.',
    '/images/retail/fresh-linen-hero.jpg', '/images/retail/fresh-linen-hero.jpg',
    '[{"url":"/images/retail/fresh-linen-hero.jpg","alt":"Illustrative Fresh Linen fragrance oil bottle"},{"url":"/images/retail/candle.jpg","alt":"Illustrative scented candle"},{"url":"/images/retail/reed-diffuser.jpg","alt":"Illustrative reed diffuser"},{"url":"/images/retail/room-spray.jpg","alt":"Illustrative room spray"}]'::jsonb,
    '{
      "heroLine":"Fragrance Enriches Everyday Living",
      "heroDescription":"From concept to creation, we craft fragrances for a more beautiful world.",
      "defaultVariantSku":"DEMO-FL-100",
      "overview":"A design example showing how a product introduction will appear. Actual ingredients, performance and recommended uses must be confirmed for each product.",
      "topNotes":"Citrus, aldehydes, green leaves (illustrative)",
      "heartNotes":"Lily of the valley, jasmine, rose (illustrative)",
      "baseNotes":"White musk, cedarwood, soft amber (illustrative)",
      "technical":[{"label":"Product Type","value":"Home fragrance oil — design example"},{"label":"Appearance","value":"To be confirmed"},{"label":"Odor Character","value":"Fresh, clean, floral — illustrative"},{"label":"IFRA Status","value":"To be verified"},{"label":"Recommended Applications","value":"To be verified"}],
      "applications":[{"title":"Candles","description":"Application visual example","image":"/images/retail/candle.jpg","alt":"Illustrative scented candle"},{"title":"Reed Diffusers","description":"Application visual example","image":"/images/retail/reed-diffuser.jpg","alt":"Illustrative reed diffuser"},{"title":"Room Sprays","description":"Application visual example","image":"/images/retail/room-spray.jpg","alt":"Illustrative room spray"}],
      "dosage":[{"label":"Candles","value":"To be confirmed by formulation test"},{"label":"Reed Diffusers","value":"To be confirmed by formulation test"},{"label":"Room Sprays","value":"To be confirmed by formulation test"}],
      "storage":["Keep in a cool, dry place","Avoid direct sunlight","Keep container tightly closed"],
      "shipping":["Shipping regions are configured in the admin","Delivery cost appears at checkout","Packaging is selected for each order"],
      "retailBenefits":["Choose your preferred size","Secure checkout after launch","Order status updates"],
      "customBenefits":["Custom fragrance development","Flexible project discussion","Technical support"],
      "packagingIntro":"Illustrative packaging formats. Actual available sizes and materials must be confirmed.",
      "packagingImage":"/images/retail/packaging-lineup.jpg",
      "downloads":[],
      "faqs":[{"question":"Can I use this in candles and reed diffusers?","answer":"The product application must be confirmed for the actual formula before purchase."},{"question":"Do you offer samples?","answer":"Contact the team to discuss sample availability."},{"question":"Do you provide custom fragrance development?","answer":"Yes, please share your brief with the team."}],
      "relatedSlugs":[]
    }'::jsonb,
    'draft', false, true
  ) on conflict (slug) do update set title = excluded.title
  returning id
)
insert into public.retail_variants (product_id, sku, label, price_minor, currency, stock_quantity, is_active, sort_order)
select sample.id, v.sku, v.label, v.price_minor, 'USD', 0, true, v.sort_order
from sample cross join (values
  ('DEMO-FL-10', '10ml', 1290, 0),
  ('DEMO-FL-100', '100ml', 1890, 1),
  ('DEMO-FL-500', '500ml', 4900, 2)
) as v(sku, label, price_minor, sort_order)
on conflict (sku) do nothing;
