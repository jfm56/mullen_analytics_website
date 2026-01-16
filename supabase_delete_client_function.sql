-- Function to delete a client and all related data
CREATE OR REPLACE FUNCTION delete_client_and_data(client_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    client_email TEXT;
BEGIN
    -- Get client email for logging
    SELECT email INTO client_email 
    FROM profiles 
    WHERE id = client_id;
    
    -- Delete in proper order to respect foreign key constraints
    
    -- Delete client's uploads
    DELETE FROM client_uploads WHERE client_id = client_id;
    
    -- Delete client's tasks
    DELETE FROM client_tasks WHERE client_id = client_id;
    
    -- Delete client's messages
    DELETE FROM messages WHERE client_id = client_id;
    
    -- Delete client's invoices (if they exist)
    DELETE FROM invoices WHERE client_id = client_id;
    
    -- Delete client's reports (if they exist)
    DELETE FROM reports WHERE client_id = client_id;
    
    -- Finally delete the client profile
    DELETE FROM profiles WHERE id = client_id;
    
    -- Log the deletion (you might want to add an audit table)
    RAISE LOG 'Client % (%) and all related data deleted by admin', client_id, client_email;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_client_and_data(UUID) TO authenticated;
