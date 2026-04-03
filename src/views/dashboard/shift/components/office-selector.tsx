'use client';

import type { OfficeData } from 'src/stores/office';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface OfficeSelectorProps {
  offices: OfficeData[];
  selected: OfficeData | null;
  onSelect: (office: OfficeData) => void;
  loading?: boolean;
}

export function OfficeSelector({ offices, selected, onSelect, loading }: Readonly<OfficeSelectorProps>) {
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          overflowX: 'auto',
          pb: 1,
          mb: 3,
          '&::-webkit-scrollbar': { height: 6 },
          '&::-webkit-scrollbar-thumb': { borderRadius: 3, bgcolor: 'divider' },
        }}
      >
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rounded" width={220} height={90} sx={{ flexShrink: 0 }} />
        ))}
      </Box>
    );
  }

  if (offices.length === 0) {
    return (
      <Box
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          bgcolor: 'background.neutral',
          textAlign: 'center',
        }}
      >
        <Iconify icon="solar:buildings-2-bold-duotone" width={40} sx={{ color: 'text.disabled', mb: 1 }} />
        <Typography color="text.secondary" variant="body2">
          Tidak ada office tersedia. Tambah office terlebih dahulu.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        overflowX: 'auto',
        pb: 1,
        mb: 3,
        '&::-webkit-scrollbar': { height: 6 },
        '&::-webkit-scrollbar-thumb': { borderRadius: 3, bgcolor: 'divider' },
      }}
    >
      {offices.map((office) => {
        const isSelected = selected?.id === office.id;
        return (
          <Card
            key={office.id}
            sx={{
              flexShrink: 0,
              width: 230,
              border: '2px solid',
              borderColor: isSelected ? 'primary.main' : 'divider',
              bgcolor: isSelected ? 'primary.lighter' : 'background.paper',
              transition: 'all 0.2s ease',
              boxShadow: isSelected ? 3 : 1,
            }}
          >
            <CardActionArea onClick={() => onSelect(office)} sx={{ height: '100%' }}>
              <CardContent sx={{ py: 1.5, px: 2 }}>
                <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                  <Box
                    sx={{
                      mt: 0.3,
                      width: 36,
                      height: 36,
                      flexShrink: 0,
                      borderRadius: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: isSelected ? 'primary.main' : 'action.selected',
                    }}
                  >
                    <Iconify
                      icon="solar:buildings-2-bold-duotone"
                      width={20}
                      sx={{ color: isSelected ? 'common.white' : 'text.secondary' }}
                    />
                  </Box>
                  <Box sx={{ overflow: 'hidden' }}>
                    <Typography
                      variant="subtitle2"
                      fontWeight={700}
                      noWrap
                      color={isSelected ? 'primary.dark' : 'text.primary'}
                    >
                      {office.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.4,
                      }}
                    >
                      {office.address}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </CardActionArea>
          </Card>
        );
      })}
    </Box>
  );
}
