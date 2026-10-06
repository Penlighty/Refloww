"use client";

import { Button } from '@/components/ui';
import { Download, FileSpreadsheet, FileText } from '@/components/icons';

interface ExportButtonsProps {
    onExportExcel: () => void;
    onExportCSV: () => void;
}

export default function ExportButtons({ onExportExcel, onExportCSV }: ExportButtonsProps) {
    return (
        <div className="flex items-center gap-2">
            <Button
                variant="secondary"
                size="sm"
                leftIcon={<FileSpreadsheet className="size-4" />}
                iconOnlyMobile
                onClick={onExportExcel}
            >
                Excel
            </Button>
            <Button
                variant="outline"
                size="sm"
                leftIcon={<FileText className="size-4" />}
                iconOnlyMobile
                onClick={onExportCSV}
            >
                CSV
            </Button>
        </div>
    );
}
