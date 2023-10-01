import xlsx from 'xlsx';

export function autoSize(ws: xlsx.WorkSheet) {
  // Find the row with the most length
  let indexWithMostColumns = 0;
  let maxColumns = 0;

  ws['!data']?.forEach((row, index) => {
    if (row.length > maxColumns) {
      maxColumns = row.length;
      indexWithMostColumns = index;
    }
  });

  // Autosize columns
  const columnSizes = ws['!data']?.[indexWithMostColumns].map(
    (_, columnIndex) =>
      ws['!data']?.reduce(
        (acc, row) => Math.max(acc, (`${row[columnIndex]}`.length ?? 0) + 2),
        0
      )
  );
  ws['!cols'] = columnSizes?.map((width) => ({ width }));
}

export function autoFilter(ws: xlsx.WorkSheet) {
  ws['!autofilter'] = {
    ref: xlsx.utils.encode_range(xlsx.utils.decode_range(ws['!ref'] as string)),
  };
}
