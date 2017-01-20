import { Request } from "express";

/**
 * Changes the query parameter to include a timestamp between the date range of the specified 
 * date parameters.
 * 
 * All date parameters include 
 *  start_date: The beginning date of the range.
 *  end_date: The ending date of the range.
 * 
 * @req - The HTTP request that contains the query parameters.
 * @query - The query to update with the new parameters.  This will override any $lte or $gte parameters already in it.
 */
export function getDateRange(req: Request, query: any)  {
    let timestamp: any = query.timestamp;

    const reqQuer = req.query;

    if (reqQuer.start_time) {
        timestamp = (timestamp) ? timestamp : {};
        Object.assign(timestamp, { $gte: new Date(reqQuer.start_time) });
    }

    if (reqQuer.end_time) {
        timestamp = (timestamp) ? timestamp : {};
        Object.assign(timestamp, { $lte: new Date(reqQuer.end_time) });
    }

    if (timestamp) {
        Object.assign(query, { timestamp: timestamp });
    }
}