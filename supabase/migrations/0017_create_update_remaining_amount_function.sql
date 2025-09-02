-- Create RPC function to update remaining amount for employee advances
CREATE OR REPLACE FUNCTION public.update_remaining_amount(p_advance_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_repayments NUMERIC := 0;
  v_original_amount NUMERIC := 0;
  v_new_remaining NUMERIC := 0;
BEGIN
  -- Get original advance amount
  SELECT amount INTO v_original_amount
  FROM public.employee_advances
  WHERE id = p_advance_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee advance not found with id: %', p_advance_id;
  END IF;
  
  -- Calculate total repayments
  SELECT COALESCE(SUM(amount), 0) INTO v_total_repayments
  FROM public.advance_repayments
  WHERE advance_id = p_advance_id;
  
  -- Calculate new remaining amount
  v_new_remaining := v_original_amount - v_total_repayments;
  
  -- Ensure remaining amount is not negative
  IF v_new_remaining < 0 THEN
    v_new_remaining := 0;
  END IF;
  
  -- Update the employee advance record
  UPDATE public.employee_advances
  SET 
    remaining_amount = v_new_remaining,
    updated_at = CASE 
      WHEN v_new_remaining = 0 THEN NOW()  -- Set updated_at when fully paid
      ELSE updated_at 
    END
  WHERE id = p_advance_id;
  
  -- Log the update
  RAISE NOTICE 'Updated advance % - Original: %, Repayments: %, Remaining: %', 
    p_advance_id, v_original_amount, v_total_repayments, v_new_remaining;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_remaining_amount(TEXT) TO authenticated;